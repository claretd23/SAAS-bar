import express from "express";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware, requireRole("admin", "superadmin"));

router.get("/dashboard", (req, res) => {
  const bid = req.user.businessId;

  // ============ NUEVO — se agregó ", 'localtime'" en cada date(created_at)
  // para que el corte de "hoy" sea el día en Aguascalientes, no en UTC ============
  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as totalToday,
      COUNT(*) as paymentsToday,
      COALESCE(AVG(amount), 0) as avgTicket
    FROM payments
    WHERE business_id = ?
      AND date(created_at, 'localtime') = date('now', 'localtime')
  `).get(bid);
  // ============ FIN NUEVO ============

  const activeOrders = db.prepare(`
    SELECT COUNT(*) as c FROM orders WHERE business_id = ? AND is_closed = 0
  `).get(bid).c;

  // ============ NUEVO ============
  const ordersToday = db.prepare(`
    SELECT items FROM orders
    WHERE business_id = ?
      AND date(created_at, 'localtime') = date('now', 'localtime')
  `).all(bid);
  // ============ FIN NUEVO ============

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

  // ============ NUEVO ============
  const byPayMethod = db.prepare(`
    SELECT pay, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM payments
    WHERE business_id = ?
      AND date(created_at, 'localtime') = date('now', 'localtime')
    GROUP BY pay
  `).all(bid);
  // ============ FIN NUEVO ============

  // ============ NUEVO ============
  const byMesa = db.prepare(`
    SELECT o.mesa as mesa, COALESCE(SUM(p.amount), 0) as total, COUNT(*) as count
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.business_id = ?
      AND date(p.created_at, 'localtime') = date('now', 'localtime')
    GROUP BY o.mesa
    ORDER BY total DESC
  `).all(bid);
  // ============ FIN NUEVO ============

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

// GET /reports/sales-history — historial de ventas con filtros, paginación
// y desglose por método de pago. Solo consulta (read-only).
router.get("/sales-history", (req, res) => {
  const bid = req.user.businessId;
  const { start_date, end_date, pay, charged_by_id, folio, limit, offset } = req.query;

  const conditions = ["p.business_id = ?"];
  const params = [bid];

  // ============ NUEVO — se agregó ", 'localtime'" para comparar contra
  // fechas locales (las que manda el frontend), no UTC ============
  if (start_date) {
    conditions.push("date(p.created_at, 'localtime') >= date(?)");
    params.push(start_date);
  }
  if (end_date) {
    conditions.push("date(p.created_at, 'localtime') <= date(?)");
    params.push(end_date);
  }
  // ============ FIN NUEVO ============
  if (pay) {
    conditions.push("p.pay = ?");
    params.push(pay);
  }
  if (charged_by_id) {
    conditions.push("p.charged_by_id = ?");
    params.push(charged_by_id);
  }
  if (folio) {
    conditions.push("p.folio = ?");
    params.push(parseInt(folio, 10));
  }

  const whereClause = conditions.join(" AND ");
  const pageLimit = Math.min(parseInt(limit) || 50, 200);
  const pageOffset = parseInt(offset) || 0;

  const sales = db.prepare(`
    SELECT
      p.id, p.folio, p.amount, p.pay, p.charged_by_id, p.charged_by_name, p.created_at,
      o.mesa as mesa, o.id as order_id, o.items as order_items
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageLimit, pageOffset);

  const totalCount = db.prepare(`
    SELECT COUNT(*) as c
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE ${whereClause}
  `).get(...params).c;

  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(p.amount), 0) as total,
      COUNT(*) as count,
      COALESCE(AVG(p.amount), 0) as avgTicket
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE ${whereClause}
  `).get(...params);

  const byPayMethod = db.prepare(`
    SELECT p.pay as pay, COALESCE(SUM(p.amount), 0) as total, COUNT(*) as count
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE ${whereClause}
    GROUP BY p.pay
  `).all(...params);

  res.json({
    sales,
    total: totalCount,
    limit: pageLimit,
    offset: pageOffset,
    summary: { ...summary, byPayMethod },
  });
});
export default router;