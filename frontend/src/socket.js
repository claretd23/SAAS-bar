import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket = null;
let currentBusinessId = null;

export function connectSocket(businessId) {
  // Si ya hay un socket conectado para este negocio, lo devuelve tal cual.
  if (socket && socket.connected && currentBusinessId === businessId) {
    return socket;
  }

  // Hay socket pero para otro negocio, o está desconectado: limpia y reconecta.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentBusinessId = businessId;

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // FIX: si el socket ya está conectado cuando se llama connectSocket
  // (ej. el barman abre sesión después de que el socket se estableció),
  // el evento "connect" no vuelve a dispararse y join_business nunca se
  // emitía — por eso el barman no recibía orders_updated.
  // Solución: emitir join_business inmediatamente si ya está conectado,
  // además de registrar el listener para futuras reconexiones.
  socket.on("connect", () => {
    console.log("[socket] conectado, room:", businessId);
    socket.emit("join_business", businessId);
  });

  if (socket.connected) {
    console.log("[socket] ya conectado, emitiendo join_business:", businessId);
    socket.emit("join_business", businessId);
  }

  socket.on("connect_error", (err) => {
    console.warn("[socket] error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentBusinessId = null;
  }
}
