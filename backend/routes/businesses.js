import express from "express";
import { nanoid } from "nanoid";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware, requireRole("superadmin"));

// Listar todos los negocios con resumen de ventas
router.get("/", (req, res) => {
  const businesses = db.prepare("SELECT * FROM businesses ORDER BY created_at DESC").all();
  const enriched = businesses.map(b => {
    const salesToday = db.prepare(`
      SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count
      FROM orders WHERE business_id = ? AND status = 'cobrado'
      AND date(created_at) = date('now')
    `).get(b.id);
    const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE business_id = ?").get(b.id).c;
    return { ...b, salesToday: salesToday.total, ordersToday: salesToday.count, userCount };
  });
  res.json(enriched);
});

// Crear negocio nuevo (cuando vendes/rentas el sistema a otro bar)
router.post("/", (req, res) => {
  const { name, ownerEmail, plan } = req.body;
  const id = nanoid(10);
  db.prepare("INSERT INTO businesses (id, name, owner_email, plan) VALUES (?, ?, ?, ?)")
    .run(id, name, ownerEmail, plan || "trial");

  // Crea usuarios default para el negocio nuevo
  const defaultUsers = [
    { role: "mesero", pin: "1111", name: "Mesero" },
    { role: "barman", pin: "2222", name: "Barman" },
    { role: "admin", pin: "3333", name: "Administrador" },
  ];
  defaultUsers.forEach(u => {
    db.prepare("INSERT INTO users (id, business_id, name, pin, role) VALUES (?, ?, ?, ?, ?)")
      .run(nanoid(8), id, u.name, u.pin, u.role);
  });

  res.json({ id, name, defaultPins: defaultUsers });
});

// Activar / desactivar negocio (para cuando no pagan la renta, por ejemplo)
router.patch("/:id/status", (req, res) => {
  const { status } = req.body; // 'active' | 'suspended'
  db.prepare("UPDATE businesses SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

router.patch("/:id/plan", (req, res) => {
  const { plan } = req.body;
  db.prepare("UPDATE businesses SET plan = ? WHERE id = ?").run(plan, req.params.id);
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  const id = req.params.id;
  db.prepare("DELETE FROM orders WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM products WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM promos WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM businesses WHERE id = ?").run(id);
  res.json({ ok: true });
});

// Ver PINs de usuarios de un negocio (para dárselos al cliente)
router.get("/:id/users", (req, res) => {
  const users = db.prepare("SELECT id, name, role, pin FROM users WHERE business_id = ?").all(req.params.id);
  res.json(users);
});

router.post("/:id/users", (req, res) => {
  const { name, role, pin } = req.body;
  const id = nanoid(8);
  db.prepare("INSERT INTO users (id, business_id, name, pin, role) VALUES (?, ?, ?, ?, ?)")
    .run(id, req.params.id, name, pin, role);
  res.json({ id });
});

export default router;