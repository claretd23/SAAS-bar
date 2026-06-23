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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());

// Sirve las imagenes subidas como archivos estaticos
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// JSON parser solo para rutas que no son multipart
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("join_business", (businessId) => {
    socket.join(businessId);
    console.log(`[socket] cliente ${socket.id} se unio al room: ${businessId}`);
  });
  socket.on("resync_requested", () => {});
  socket.on("disconnect", (reason) => {
    console.log(`[socket] cliente ${socket.id} desconectado: ${reason}`);
  });
});

app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/promos", promoRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));