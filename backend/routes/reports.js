import express from "express";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware, requireRole("admin", "superadmin"));

router.get("/dashboard", (req, res) => {
  const bid = req.user.businessId;

  // Total y conteo de órdenes cobradas hoy
  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(total), 0) as totalToday,
      COUNT(*) as ordersToday,
      COALESCE(AVG(total), 0) as avgTicket
    FROM orders
    WHERE business_id = ?
      AND status = 'cobrado'
      AND date(created_at) = date('now', 'localtime')
  `).get(bid);

  // Top 5 productos vendidos hoy
  const ordersToday = db.prepare(`
    SELECT items FROM orders
    WHERE business_id = ?
      AND status = 'cobrado'
      AND date(created_at) = date('now', 'localtime')
  `).all(bid);

  // Agregar items de todas las órdenes del día
  const productMap = {};
  for (const order of ordersToday) {
    const items = JSON.parse(order.items);
    for (const item of items) {
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

  // Ventas por método de pago hoy
  const byPayMethod = db.prepare(`
    SELECT pay, COALESCE(SUM(total), 0) as total, COUNT(*) as count
    FROM orders
    WHERE business_id = ?
      AND status = 'cobrado'
      AND date(created_at) = date('now', 'localtime')
    GROUP BY pay
  `).all(bid);

  // Ventas por mesa hoy
  const byMesa = db.prepare(`
    SELECT mesa, COALESCE(SUM(total), 0) as total, COUNT(*) as count
    FROM orders
    WHERE business_id = ?
      AND status = 'cobrado'
      AND date(created_at) = date('now', 'localtime')
    GROUP BY mesa
    ORDER BY total DESC
  `).all(bid);

  res.json({
    totalToday: summary.totalToday,
    ordersToday: summary.ordersToday,
    avgTicket: summary.avgTicket,
    topProducts,
    byPayMethod,
    byMesa,
  });
});

export default router;