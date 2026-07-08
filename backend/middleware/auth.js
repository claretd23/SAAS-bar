import jwt from "jsonwebtoken";
import db from "../db.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Sin token" });
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "superadmin") {
      const current = db.prepare("SELECT session_version FROM users WHERE id = ?").get(payload.userId);
      if (!current || current.session_version !== payload.sv) {
        return res.status(401).json({ error: "Sesión cerrada, inicia sesión de nuevo" });
      }
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No autorizado" });
    }
    next();
  };
}