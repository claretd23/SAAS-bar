import express from "express";
import { nanoid } from "nanoid";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carpeta donde se guardan las imágenes
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${nanoid(12)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB máx
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Solo se permiten imágenes JPG, PNG o WebP"));
  },
});

const router = express.Router();
router.use(authMiddleware);

// Helper para construir la URL pública de la imagen
function imageUrl(req, filename) {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
}

// Helper para borrar imagen anterior del disco
function deleteImage(imageUrl) {
  if (!imageUrl) return;
  const filename = imageUrl.split("/uploads/").pop();
  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
}

// GET — todos los productos del negocio
router.get("/", (req, res) => {
  const products = db
    .prepare("SELECT * FROM products WHERE business_id = ? ORDER BY cat, name")
    .all(req.user.businessId);
  res.json(products);
});

// POST — crear producto con imagen opcional
router.post(
  "/",
  requireRole("admin", "superadmin"),
  upload.single("image"),
  (req, res) => {
    const { name, cat, price, stock, emoji } = req.body;
    if (!name || !cat || price == null) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "name, cat y price son obligatorios" });
    }
    const id = nanoid(10);
    const filename = req.file ? req.file.filename : null;
    const imgUrl = filename ? `/uploads/${filename}` : null;

    db.prepare(
      "INSERT INTO products (id, business_id, name, cat, price, stock, emoji, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, req.user.businessId, name, cat, +price, +stock || 0, emoji || "🍹", imgUrl);

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    req.app.get("io").to(req.user.businessId).emit("products_updated");
    res.json(product);
  }
);

// PUT — editar producto (con imagen opcional)
router.put(
  "/:id",
  requireRole("admin", "superadmin"),
  upload.single("image"),
  (req, res) => {
    const existing = db
      .prepare("SELECT * FROM products WHERE id = ? AND business_id = ?")
      .get(req.params.id, req.user.businessId);
    if (!existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const { name, cat, price, stock, emoji, remove_image } = req.body;

    let imgUrl = existing.image_url;

    if (req.file) {
      // Subió imagen nueva → borrar la vieja
      deleteImage(existing.image_url);
      imgUrl = `/uploads/${req.file.filename}`;
    } else if (remove_image === "true") {
      // Pidió quitar la imagen
      deleteImage(existing.image_url);
      imgUrl = null;
    }

    db.prepare(
      "UPDATE products SET name=?, cat=?, price=?, stock=?, emoji=?, image_url=? WHERE id=?"
    ).run(
      name ?? existing.name,
      cat ?? existing.cat,
      price != null ? +price : existing.price,
      stock != null ? +stock : existing.stock,
      emoji ?? existing.emoji,
      imgUrl,
      req.params.id
    );

    req.app.get("io").to(req.user.businessId).emit("products_updated");
    res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
  }
);

// DELETE — eliminar producto y su imagen
router.delete("/:id", requireRole("admin", "superadmin"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM products WHERE id = ? AND business_id = ?")
    .get(req.params.id, req.user.businessId);
  if (!existing) return res.status(404).json({ error: "Producto no encontrado" });

  deleteImage(existing.image_url);
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  req.app.get("io").to(req.user.businessId).emit("products_updated");
  res.json({ ok: true });
});

// PATCH — ajustar stock
router.patch("/:id/stock", requireRole("admin", "superadmin"), (req, res) => {
  const product = db
    .prepare("SELECT * FROM products WHERE id = ? AND business_id = ?")
    .get(req.params.id, req.user.businessId);
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  let newStock;
  if (req.body.set != null) {
    newStock = Math.max(0, +req.body.set);
  } else if (req.body.delta != null) {
    newStock = Math.max(0, product.stock + +req.body.delta);
  } else {
    return res.status(400).json({ error: "Envía 'set' o 'delta'" });
  }

  db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(newStock, req.params.id);
  req.app.get("io").to(req.user.businessId).emit("products_updated");
  res.json({ ok: true, stock: newStock });
});

export default router;