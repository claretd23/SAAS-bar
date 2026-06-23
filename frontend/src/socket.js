import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket = null;

export function connectSocket(businessId) {
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    socket.emit("join_business", businessId);
    socket.emit("resync_requested");
  });

  // Si por alguna razón el socket ya estaba conectado al llamar
  // connectSocket (no debería pasar tras el disconnect() de arriba,
  // pero por si acaso), emitir join_business inmediatamente.
  if (socket.connected) {
    socket.emit("join_business", businessId);
  }

  socket.on("connect_error", (err) => {
    console.warn("Socket: error de conexión, reintentando…", err.message);
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