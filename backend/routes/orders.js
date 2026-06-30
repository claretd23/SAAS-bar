import express from "express";
import { nanoid } from "nanoid";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

const ITEM_STATUS_FLOW = ["pendiente", "preparando", "listo"];

function parseOrder(o) {
  return { ...o, items: JSON.parse(o.items), is_closed: !!o.is_closed };
}

// GET — órdenes del día del negocio (incluye cerradas, para historial)
router.get("/", (req, res) => {
  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE business_id = ?
      AND date(created_at) = date('now', 'localtime')
    ORDER BY created_at DESC
  `).all(req.user.businessId);

  res.json(orders.map(parseOrder));
});

// POST — enviar productos a una mesa (mesero o barman atendiendo la barra).
// Si la mesa ya tiene una cuenta activa (is_closed = 0), se AGREGAN los
// items a esa misma orden en vez de crear una nueva — así toda la mesa
// queda en una sola cuenta acumulada, aunque se manden varias rondas.
router.post("/", requireRole("mesero", "barman", "admin", "superadmin"), (req, res) => {
  const { mesa, items, note } = req.body;

  if (!items?.length) return res.status(400).json({ error: "La orden necesita al menos un producto" });
  if (mesa == null || mesa === "") return res.status(400).json({ error: "La mesa es obligatoria" });

  const mesaStr = String(mesa);
  const newItems = items.map(it => ({
    ...it,
    status: "pendiente",
    paid: false,
    paidQty: 0,
  }));

  const addToTable = db.transaction(() => {
    const existing = db.prepare(`
      SELECT * FROM orders
      WHERE business_id = ? AND mesa = ? AND is_closed = 0
      ORDER BY created_at DESC LIMIT 1
    `).get(req.user.businessId, mesaStr);

    if (existing) {
      const currentItems = JSON.parse(existing.items);
      const mergedItems = [...currentItems, ...newItems];
      const addedTotal = newItems.reduce((s, it) => s + it.price * it.qty, 0);
      db.prepare("UPDATE orders SET items = ?, total = total + ?, note = ? WHERE id = ?")
        .run(JSON.stringify(mergedItems), addedTotal, note || existing.note, existing.id);
      return { id: existing.id, merged: true };
    }

    const id = nanoid(10);
    const total = newItems.reduce((s, it) => s + it.price * it.qty, 0);
    db.prepare(`
      INSERT INTO orders (id, business_id, mesa, items, note, disc, promo_disc, total, is_closed, created_by_id, created_by_name)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, 0, ?, ?)
    `).run(id, req.user.businessId, mesaStr, JSON.stringify(newItems), note || "", total, req.user.userId || null, req.user.name || null);
    return { id, merged: false };
  });

  const result = addToTable();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(result.id);

  req.app.get("io").to(req.user.businessId).emit("orders_updated");
  console.log(`[orders] nueva orden en room: ${req.user.businessId}`);
  res.json(parseOrder(order));
});

// PATCH /:id/items/:itemIndex/status — el barman avanza el estado de UN
// producto específico dentro de la cuenta (pendiente → preparando → listo).
// No afecta el resto de los items de la misma mesa.
router.patch("/:id/items/:itemIndex/status", requireRole("barman", "admin", "superadmin"), (req, res) => {
  const { status } = req.body;
  const itemIndex = parseInt(req.params.itemIndex, 10);
  if (!ITEM_STATUS_FLOW.includes(status)) return res.status(400).json({ error: "Estado inválido" });

  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND business_id = ?")
    .get(req.params.id, req.user.businessId);
  if (!order) return res.status(404).json({ error: "Orden no encontrada" });

  const items = JSON.parse(order.items);
  if (!items[itemIndex]) return res.status(404).json({ error: "Producto no encontrado en la orden" });

  items[itemIndex].status = status;
  db.prepare("UPDATE orders SET items = ? WHERE id = ?").run(JSON.stringify(items), req.params.id);

  req.app.get("io").to(req.user.businessId).emit("orders_updated");
  res.json({ ok: true });
});

// POST /:id/payments — registra un pago (parcial o total) contra la cuenta
// de la mesa. `itemIndexes` son los índices de los items que cubre este
// pago (para que alguien pueda pagar solo lo que consumió). Si después del
// pago ya no queda nada sin pagar, la orden se cierra automáticamente
// (is_closed = 1) y AHÍ se descuenta el stock — no antes.
router.post("/:id/payments", requireRole( "barman", "admin", "superadmin"), (req, res) => {
  const { pay, itemIndexes } = req.body;
  if (!pay) return res.status(400).json({ error: "Falta método de pago" });
  if (!itemIndexes?.length) return res.status(400).json({ error: "Selecciona qué se está pagando" });

  const chargeTable = db.transaction(() => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND business_id = ?")
      .get(req.params.id, req.user.businessId);
    if (!order) {
      const err = new Error("Orden no encontrada");
      err.status = 404;
      throw err;
    }
    if (order.is_closed) {
      const err = new Error("Esta cuenta ya está cerrada");
      err.status = 409;
      throw err;
    }

    const items = JSON.parse(order.items);
    let amount = 0;
    let insufficientStock = [];

    // 1) Validar stock de los items que se van a pagar/cerrar AHORA,
    //    antes de tocar nada (todo o nada, igual que antes).
    const getProduct = db.prepare(
      "SELECT id, name, stock, unlimited_stock FROM products WHERE id = ? AND business_id = ?"
    );
    for (const idx of itemIndexes) {
      const item = items[idx];
      if (!item) continue;
      if (item.paid) continue; // ya estaba pagado, no se vuelve a cobrar ni a descontar
      amount += item.price * item.qty;

      const product = getProduct.get(item.id, req.user.businessId);
      if (!product) continue;
      if (product.unlimited_stock) continue;
      if (product.stock < item.qty) {
        insufficientStock.push({ id: product.id, name: product.name, disponible: product.stock, solicitado: item.qty });
      }
    }

    if (insufficientStock.length > 0) {
      const err = new Error("Stock insuficiente");
      err.status = 409;
      err.insufficientStock = insufficientStock;
      throw err;
    }

    if (amount <= 0) {
      const err = new Error("Los productos seleccionados ya estaban pagados");
      err.status = 409;
      throw err;
    }

    // 2) Marcar como pagados y descontar stock de esos items.
    const deductStock = db.prepare(
      "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND business_id = ? AND unlimited_stock = 0"
    );
    for (const idx of itemIndexes) {
      const item = items[idx];
      if (!item || item.paid) continue;
      item.paid = true;
      item.paidQty = item.qty;
      deductStock.run(item.qty, item.id, req.user.businessId);
    }

    const paymentId = nanoid(10);
    db.prepare(`
      INSERT INTO payments (id, business_id, order_id, amount, pay, charged_by_id, charged_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, req.user.businessId, order.id, amount, pay, req.user.userId || null, req.user.name || null);

    const allPaid = items.every(it => it.paid);
    db.prepare("UPDATE orders SET items = ?, is_closed = ? WHERE id = ?")
      .run(JSON.stringify(items), allPaid ? 1 : 0, order.id);

    return { amount, allPaid };
  });

  let result;
  try {
    result = chargeTable();
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: e.message, insufficientStock: e.insufficientStock });
    if (e.status === 404) return res.status(404).json({ error: e.message });
    console.error("Error procesando pago:", e);
    return res.status(500).json({ error: "Error interno al procesar el pago" });
  }

  req.app.get("io").to(req.user.businessId).emit("products_updated");
  req.app.get("io").to(req.user.businessId).emit("orders_updated");
  res.json({ ok: true, amount: result.amount, closed: result.allPaid });
});

export default router;
