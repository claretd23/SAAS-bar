import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket = null;
let currentBusinessId = null;

export function connectSocket(businessId) {
  // Si ya hay un socket conectado para este negocio, lo devuelve tal cual.
  // Esto es crítico: App.jsx llama connectSocket cada vez que el useEffect
  // corre (re-renders, StrictMode, etc.), y no queremos crear un socket
  // nuevo cada vez.
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

  // join_business se emite desde aquí en cada conexión/reconexión.
  // Los listeners de negocio (orders_updated, etc.) los registra App.jsx
  // sobre el mismo objeto socket que retornamos.
  socket.on("connect", () => {
    console.log("[socket] conectado, room:", businessId);
    socket.emit("join_business", businessId);
  });

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
