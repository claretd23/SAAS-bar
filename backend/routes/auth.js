import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import db from "../db.js";

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { businessId, pin } = req.body;
    if (!businessId || !pin) return res.status(400).json({ error: "businessId y pin son obligatorios" });

    
    const candidates = db.prepare("SELECT * FROM users WHERE business_id = ?").all(businessId);

    let user = null;
    for (const candidate of candidates) {
      if (await bcrypt.compare(String(pin), candidate.pin)) {
        user = candidate;
        break;
      }
    }
    if (!user) return res.status(401).json({ error: "PIN incorrecto" });

    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(businessId);
    if (!business || business.status !== "active") return res.status(403).json({ error: "Negocio inactivo, contacta al super-admin" });

    const token = jwt.sign(
  { userId: user.id, businessId: user.business_id, role: user.role, name: user.name, sv: user.session_version },
  process.env.JWT_SECRET
);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, businessId: user.business_id } });
  } catch (err) {
    next(err);
  }
});


// Login de super-admin (dueño de la plataforma) — usuario/contraseña fija por env, no por negocio
router.post("/superadmin-login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.SUPERADMIN_PASSWORD) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
  const token = jwt.sign({ role: "superadmin" }, process.env.JWT_SECRET);
  res.json({ token, user: { role: "superadmin", name: "Super Admin" } });
});

export default router;