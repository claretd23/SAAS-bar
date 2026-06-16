import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket = null;

export function connectSocket(businessId) {
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    // Reconexión agresiva: importante para tablets/celulares que se quedan
    // en reposo y pierden el socket sin que el usuario haga nada.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Se dispara en la conexión inicial Y en cada reconexión exitosa
  // (Socket.IO emite "connect" ambas veces, no solo la primera).
  socket.on("connect", () => {
    socket.emit("join_business", businessId);
    // "resync" le dice a App.jsx que vuelva a pedir órdenes/productos por si
    // se perdieron eventos mientras el socket estuvo desconectado (ej. iPad
    // en reposo). Sin esto, la pantalla queda desincronizada hasta que llegue
    // el siguiente evento del servidor.
    socket.emit("resync_requested");
  });

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