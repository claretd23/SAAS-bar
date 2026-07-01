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
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedMime = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();

    // Validamos por extensión O por mimetype. Algunos navegadores/clientes
    // (capturas de pantalla en Windows, pegado desde portapapeles, ciertos
    // apps de cámara) no ponen extensión en el nombre del archivo o la
    // ponen distinta al contenido real — pero el mimetype que manda el
    // navegador suele ser correcto. Con solo extensión, esos casos se
    // rechazaban aunque la imagen fuera válida.
    if (allowedExt.includes(ext) || allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Solo se permiten imágenes JPG, PNG o WebP (recibido: ${file.mimetype || "tipo desconocido"}, nombre: ${file.originalname})`));
    }
  },
});

const router = express.Router();
router.use(authMiddleware);

// Envuelve upload.single("image") para capturar errores de Multer
// (fileFilter rechazado, archivo muy grande, etc.) y devolverlos como JSON
// limpio con status 400, en vez de dejar que truenen como excepción sin
// manejar — antes esos errores solo se veían como stack trace en la
// consola del servidor y el frontend recibía un error genérico.
function uploadImage(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "La imagen no debe superar 3MB" });
      }
      return res.status(400).json({ error: `Error subiendo imagen: ${err.message}` });
    }
    // Errores lanzados manualmente desde fileFilter (cb(new Error(...)))
    return res.status(400).json({ error: err.message || "Archivo no válido" });
  });
}

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
  uploadImage,
  (req, res) => {
    const { name, cat, price, stock} = req.body;
    if (!name || !cat || price == null) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "name, cat y price son obligatorios" });
    }
    const id = nanoid(10);
    const filename = req.file ? req.file.filename : null;
    const imgUrl = filename ? `/uploads/${filename}` : null;

    db.prepare(
  "INSERT INTO products (id, business_id, name, cat, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
).run(id, req.user.businessId, name, cat, +price, +stock || 0, imgUrl);

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    req.app.get("io").to(req.user.businessId).emit("products_updated");
    res.json(product);
  }
);

// PUT — editar producto (con imagen opcional)
router.put(
  "/:id",
  requireRole("admin", "superadmin"),
  uploadImage,
  (req, res) => {
    const existing = db
      .prepare("SELECT * FROM products WHERE id = ? AND business_id = ?")
      .get(req.params.id, req.user.businessId);
    if (!existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const { name, cat, price, stock, remove_image } = req.body;

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
      "UPDATE products SET name=?, cat=?, price=?, stock=?, image_url=? WHERE id=?"
    ).run(
      name ?? existing.name,
      cat ?? existing.cat,
      price != null ? +price : existing.price,
      stock != null ? +stock : existing.stock,
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