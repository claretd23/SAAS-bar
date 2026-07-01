import express from "express";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

// Listar todos los negocios con resumen de ventas
router.get("/", requireRole("superadmin"), (req, res) => {
  const businesses = db.prepare("SELECT * FROM businesses ORDER BY created_at DESC").all();
  const enriched = businesses.map(b => {
    const salesToday = db.prepare(`
      SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
      FROM payments WHERE business_id = ?
      AND date(created_at) = date('now')
    `).get(b.id);
    const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE business_id = ?").get(b.id).c;
    return { ...b, salesToday: salesToday.total, ordersToday: salesToday.count, userCount };
  });
  res.json(enriched);
});

// Crear negocio nuevo (cuando vendes/rentas el sistema a otro bar)
router.post("/", requireRole("superadmin"), async (req, res, next) => {
  try {
    const { name, ownerEmail, plan } = req.body;
    const id = nanoid(10);
    db.prepare("INSERT INTO businesses (id, name, owner_email, plan) VALUES (?, ?, ?, ?)")
      .run(id, name, ownerEmail, plan || "trial");

    const defaultUsers = [
      { role: "mesero", pin: "1111", name: "Mesero" },
      { role: "barman", pin: "2222", name: "Barman" },
      { role: "admin", pin: "3333", name: "Administrador" },
    ];
    for (const u of defaultUsers) {
      const hashedPin = await bcrypt.hash(u.pin, 10);
      db.prepare("INSERT INTO users (id, business_id, name, pin, role) VALUES (?, ?, ?, ?, ?)")
        .run(nanoid(8), id, u.name, hashedPin, u.role);
    }

    // defaultPins se devuelve UNA SOLA VEZ aquí, en texto plano, para que el
    // superadmin se los pueda dar al cliente nuevo. No se vuelven a poder
    // consultar después porque en la base solo queda el hash.
    res.json({ id, name, defaultPins: defaultUsers });
  } catch (err) {
    next(err);
  }
});

// Activar / desactivar negocio (para cuando no pagan la renta, por ejemplo)
router.patch("/:id/status", requireRole("superadmin"), (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE businesses SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

router.patch("/:id/plan", requireRole("superadmin"), (req, res) => {
  const { plan } = req.body;
  db.prepare("UPDATE businesses SET plan = ? WHERE id = ?").run(plan, req.params.id);
  res.json({ ok: true });
});

router.delete("/:id", requireRole("superadmin"), (req, res) => {
  const id = req.params.id;
  db.prepare("DELETE FROM orders WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM products WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM promos WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE business_id = ?").run(id);
  db.prepare("DELETE FROM businesses WHERE id = ?").run(id);
  res.json({ ok: true });
});

function ownBusinessOrSuperadmin(req, res, next) {
  if (req.user.role === "superadmin") return next();
  if (req.user.role === "admin" && req.user.businessId === req.params.id) return next();
  return res.status(403).json({ error: "No autorizado" });
}

router.get("/:id/users", ownBusinessOrSuperadmin, (req, res) => {
  const users = db.prepare("SELECT id, name, role FROM users WHERE business_id = ?").all(req.params.id);
  res.json(users);
});

router.post("/:id/users", ownBusinessOrSuperadmin, async (req, res, next) => {
  try {
    const { name, role, pin } = req.body;
    if (!name || !role || !pin) return res.status(400).json({ error: "Nombre, rol y PIN son obligatorios" });
    if (!/^\d{4,6}$/.test(pin)) return res.status(400).json({ error: "El PIN debe ser numérico, de 4 a 6 dígitos" });
    if (req.user.role === "admin" && role === "superadmin") return res.status(403).json({ error: "No autorizado" });

    const existingUsers = db.prepare("SELECT pin FROM users WHERE business_id = ?").all(req.params.id);
    for (const u of existingUsers) {
      if (await bcrypt.compare(String(pin), u.pin)) {
        return res.status(409).json({ error: "Ese PIN ya está en uso por otro usuario de este negocio" });
      }
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    const id = nanoid(8);
    db.prepare("INSERT INTO users (id, business_id, name, pin, role) VALUES (?, ?, ?, ?, ?)")
      .run(id, req.params.id, name, hashedPin, role);
    res.json({ id });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/users/:userId", ownBusinessOrSuperadmin, (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ? AND business_id = ?").run(req.params.userId, req.params.id);
  res.json({ ok: true });
});

export default router;