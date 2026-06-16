import express from "express";
import { nanoid } from "nanoid";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

// GET — órdenes del día del negocio
router.get("/", (req, res) => {
  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE business_id = ?
      AND date(created_at) = date('now', 'localtime')
    ORDER BY created_at DESC
  `).all(req.user.businessId);

  // items está guardado como JSON string — parsearlo
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

// POST — crear orden (mesero)
router.post("/", requireRole("mesero", "admin", "superadmin"), (req, res) => {
  const { mesa, items, note, pay, disc, promoDisc, total } = req.body;

  if (!items?.length) return res.status(400).json({ error: "La orden necesita al menos un producto" });
  if (!mesa) return res.status(400).json({ error: "La mesa es obligatoria" });

  const id = nanoid(10);
  db.prepare(`
    INSERT INTO orders (id, business_id, mesa, items, note, pay, disc, promo_disc, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
  `).run(
    id,
    req.user.businessId,
    +mesa,
    JSON.stringify(items),
    note || "",
    pay || "ef",
    +disc || 0,
    +promoDisc || 0,
    +total
  );

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);

  // Emitir a barman y admin en tiempo real
  req.app.get("io").to(req.user.businessId).emit("orders_updated");

  res.json({ ...order, items: JSON.parse(order.items) });
});

// PATCH — cambiar estado de orden
router.patch("/:id/status", requireRole("mesero", "barman", "admin", "superadmin"), (req, res) => {
  const { status } = req.body;
  const VALID = ["pendiente", "preparando", "listo", "cobrado"];
  if (!VALID.includes(status)) return res.status(400).json({ error: "Estado inválido" });

  // Toda la operación (leer orden + validar stock + descontar + actualizar estado)
  // corre en UNA sola transacción SQLite. better-sqlite3 es síncrono, así que
  // mientras esta transacción corre, ninguna otra request puede leer/escribir
  // las mismas filas a medias — esto cierra la race condition de raíz.
  const advanceOrder = db.transaction(() => {
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND business_id = ?")
      .get(req.params.id, req.user.businessId);
    if (!order) {
      const err = new Error("Orden no encontrada");
      err.status = 404;
      throw err;
    }

    // Evita doble-cobro: si ya está cobrada, no se vuelve a descontar stock.
    // (doble click, doble tap, request duplicado por red lenta, etc.)
    if (order.status === "cobrado" && status === "cobrado") {
      return { order, alreadyCharged: true, insufficientStock: [] };
    }

    let insufficientStock = [];

    if (status === "cobrado") {
      const items = JSON.parse(order.items);

      // 1) Verificar stock disponible ANTES de descontar nada.
      //    Si algo no alcanza, no se descuenta NADA (todo o nada) y se avisa
      //    al admin/barman para que decida (cobrar igual, quitar producto, etc.)
      const getProduct = db.prepare(
        "SELECT id, name, stock, unlimited_stock FROM products WHERE id = ? AND business_id = ?"
      );
      for (const item of items) {
        const product = getProduct.get(item.id, req.user.businessId);
        if (!product) continue; // producto eliminado, no bloquea el cobro
        if (product.unlimited_stock) continue; // bebidas preparadas, sin límite
        if (product.stock < item.qty) {
          insufficientStock.push({
            id: product.id,
            name: product.name,
            disponible: product.stock,
            solicitado: item.qty,
          });
        }
      }

      if (insufficientStock.length > 0) {
        const err = new Error("Stock insuficiente");
        err.status = 409; // Conflict
        err.insufficientStock = insufficientStock;
        throw err;
      }

      // 2) Ya validado que alcanza para todos los productos: descontar.
      const deductStock = db.prepare(
        "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND business_id = ? AND unlimited_stock = 0"
      );
      for (const item of items) {
        deductStock.run(item.qty, item.id, req.user.businessId);
      }
    }

    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    return { order, alreadyCharged: false, insufficientStock: [] };
  });

  let result;
  try {
    result = advanceOrder();
  } catch (e) {
    if (e.status === 409) {
      return res.status(409).json({
        error: "No hay suficiente stock para cobrar esta orden",
        insufficientStock: e.insufficientStock,
      });
    }
    if (e.status === 404) {
      return res.status(404).json({ error: e.message });
    }
    console.error("Error avanzando orden:", e);
    return res.status(500).json({ error: "Error interno al actualizar la orden" });
  }

  if (status === "cobrado" && !result.alreadyCharged) {
    req.app.get("io").to(req.user.businessId).emit("products_updated");
  }

  req.app.get("io").to(req.user.businessId).emit("orders_updated");
  res.json({ ok: true, status, alreadyCharged: result.alreadyCharged });
});

export default router;