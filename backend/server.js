import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import promoRoutes from "./routes/promos.js";
import orderRoutes from "./routes/orders.js";
import businessRoutes from "./routes/businesses.js";
import reportRoutes from "./routes/reports.js";

dotenv.config();

const requiredEnvVars = ["JWT_SECRET", "SUPERADMIN_PASSWORD"  ];
const missingEnvVars = requiredEnvVars.filter(name => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.error(`Faltan variables de entorno requeridas: ${missingEnvVars.join(", ")}`);
  console.error("Crea un archivo .env en backend/ basado en .env.example");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_URL }));

// Sirve las imagenes subidas como archivos estaticos
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// JSON parser solo para rutas que no son multipart
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: FRONTEND_URL } });

io.on("connection", (socket) => {
  socket.on("join_business", (businessId) => {
    socket.join(businessId);
  });
  // El cliente lo emite tras cada reconexión. Por ahora el resync real lo
  // hace el cliente (vuelve a pedir /api/orders y /api/products), pero deja
  // el hook listo si más adelante se quiere reenviar algo desde el servidor.
  socket.on("resync_requested", () => {});
});

app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/promos", promoRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/reports", reportRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Error interno del servidor" : err.message,
  });
});
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));