import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket = null;

export function connectSocket(businessId) {
  // Si ya hay un socket para este mismo businessId conectado, lo reutiliza.
  // Si hay uno para otro negocio, lo desconecta primero.
  if (socket) {
    if (socket.connected && socket._businessId === businessId) return socket;
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket._businessId = businessId;

  // join_business se emite SOLO desde aquí, una vez por conexión/reconexión.
  // App.jsx registra sus propios listeners (orders_updated, etc.) sobre el
  // mismo objeto socket que retornamos, sin duplicar el join.
  socket.on("connect", () => {
    console.log("[socket] conectado, entrando al room:", businessId);
    socket.emit("join_business", businessId);
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] error de conexion:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] desconectado:", reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
