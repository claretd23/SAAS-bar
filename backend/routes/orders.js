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

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND business_id = ?")
    .get(req.params.id, req.user.businessId);
  if (!order) return res.status(404).json({ error: "Orden no encontrada" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);

  // Al cobrar: descontar stock de cada producto
  if (status === "cobrado") {
    const items = JSON.parse(order.items);
    const deductStock = db.prepare(
      "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND business_id = ?"
    );
    const deductMany = db.transaction((items) => {
      for (const item of items) {
        deductStock.run(item.qty, item.id, req.user.businessId);
      }
    });
    deductMany(items);
    req.app.get("io").to(req.user.businessId).emit("products_updated");
  }

  req.app.get("io").to(req.user.businessId).emit("orders_updated");
  res.json({ ok: true, status });
});

export default router;