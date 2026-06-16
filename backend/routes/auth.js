import express from "express";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import db from "../db.js";

const router = express.Router();

// Login por PIN — el mesero/barman/admin elige negocio + PIN
router.post("/login", (req, res) => {
  const { businessId, pin } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE business_id = ? AND pin = ?").get(businessId, pin);
  if (!user) return res.status(401).json({ error: "PIN incorrecto" });

  const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(businessId);
  if (business.status !== "active") return res.status(403).json({ error: "Negocio inactivo, contacta al super-admin" });

  const token = jwt.sign(
    { userId: user.id, businessId: user.business_id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, businessId: user.business_id } });
});

// Login de super-admin (dueño de la plataforma) — usuario/contraseña fija por env, no por negocio
router.post("/superadmin-login", (req, res) => {
  const { password } = req.body;
  if (password !== process.env.SUPERADMIN_PASSWORD) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
  const token = jwt.sign({ role: "superadmin" }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

export default router;