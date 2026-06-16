import express from "express";
import { nanoid } from "nanoid";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", (req, res) => {
  const promos = db
    .prepare("SELECT * FROM promos WHERE business_id = ? ORDER BY name")
    .all(req.user.businessId);
  // Convertir active de 0/1 a boolean para el frontend
  res.json(promos.map(p => ({ ...p, active: !!p.active })));
});

router.post("/", requireRole("admin", "superadmin"), (req, res) => {
  const { name, desc, type, discount, emoji } = req.body;
  if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
  const id = nanoid(10);
  db.prepare(
    "INSERT INTO promos (id, business_id, name, desc, type, discount, emoji, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
  ).run(id, req.user.businessId, name, desc || "", type || "percent", +discount || 0, emoji || "🏷️");
  const promo = db.prepare("SELECT * FROM promos WHERE id = ?").get(id);
  res.json({ ...promo, active: !!promo.active });
});

router.put("/:id", requireRole("admin", "superadmin"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM promos WHERE id = ? AND business_id = ?")
    .get(req.params.id, req.user.businessId);
  if (!existing) return res.status(404).json({ error: "Promo no encontrada" });

  const { name, desc, type, discount, emoji } = req.body;
  db.prepare(
    "UPDATE promos SET name=?, desc=?, type=?, discount=?, emoji=? WHERE id=?"
  ).run(
    name ?? existing.name,
    desc ?? existing.desc,
    type ?? existing.type,
    discount != null ? +discount : existing.discount,
    emoji ?? existing.emoji,
    req.params.id
  );
  const promo = db.prepare("SELECT * FROM promos WHERE id = ?").get(req.params.id);
  res.json({ ...promo, active: !!promo.active });
});

router.delete("/:id", requireRole("admin", "superadmin"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM promos WHERE id = ? AND business_id = ?")
    .get(req.params.id, req.user.businessId);
  if (!existing) return res.status(404).json({ error: "Promo no encontrada" });
  db.prepare("DELETE FROM promos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Activar / desactivar
router.patch("/:id/toggle", requireRole("admin", "superadmin"), (req, res) => {
  const promo = db
    .prepare("SELECT * FROM promos WHERE id = ? AND business_id = ?")
    .get(req.params.id, req.user.businessId);
  if (!promo) return res.status(404).json({ error: "Promo no encontrada" });
  const newActive = promo.active ? 0 : 1;
  db.prepare("UPDATE promos SET active = ? WHERE id = ?").run(newActive, req.params.id);
  res.json({ ok: true, active: !!newActive });
});

export default router;