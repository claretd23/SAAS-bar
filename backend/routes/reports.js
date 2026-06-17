import express from "express";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware, requireRole("admin", "superadmin"));

router.get("/dashboard", (req, res) => {
  const bid = req.user.businessId;

  // Total y conteo de pagos (no de órdenes — una mesa puede generar varios
  // pagos parciales) cobrados hoy.
  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as totalToday,
      COUNT(*) as paymentsToday,
      COALESCE(AVG(amount), 0) as avgTicket
    FROM payments
    WHERE business_id = ?
      AND date(created_at) = date('now', 'localtime')
  `).get(bid);

  // Órdenes activas (cuentas de mesa aún sin cerrar) — para que el admin
  // vea cuántas mesas siguen abiertas en este momento, sin importar el día.
  const activeOrders = db.prepare(`
    SELECT COUNT(*) as c FROM orders WHERE business_id = ? AND is_closed = 0
  `).get(bid).c;

  // Top 5 productos vendidos hoy: se cuentan los items que ya están
  // marcados como pagados (paid = true) dentro de órdenes de hoy.
  const ordersToday = db.prepare(`
    SELECT items FROM orders
    WHERE business_id = ?
      AND date(created_at) = date('now', 'localtime')
  `).all(bid);

  const productMap = {};
  for (const order of ordersToday) {
    const items = JSON.parse(order.items);
    for (const item of items) {
      if (!item.paid) continue;
      if (!productMap[item.id]) {
        productMap[item.id] = { id: item.id, name: item.name, emoji: item.emoji, qty: 0, total: 0 };
      }
      productMap[item.id].qty += item.qty;
      productMap[item.id].total += item.price * item.qty;
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Ventas por método de pago hoy — ahora viene de payments, así una mesa
  // pagada en partes con métodos distintos se contabiliza correctamente
  // en cada método, no solo en el último que se usó.
  const byPayMethod = db.prepare(`
    SELECT pay, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM payments
    WHERE business_id = ?
      AND date(created_at) = date('now', 'localtime')
    GROUP BY pay
  `).all(bid);

  // Ventas por mesa hoy (suma de pagos, agrupado por la mesa de la orden a
  // la que pertenece cada pago).
  const byMesa = db.prepare(`
    SELECT o.mesa as mesa, COALESCE(SUM(p.amount), 0) as total, COUNT(*) as count
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.business_id = ?
      AND date(p.created_at) = date('now', 'localtime')
    GROUP BY o.mesa
    ORDER BY total DESC
  `).all(bid);

  res.json({
    totalToday: summary.totalToday,
    ordersToday: summary.paymentsToday,
    activeOrders,
    avgTicket: summary.avgTicket,
    topProducts,
    byPayMethod,
    byMesa,
  });
});

export default router;
