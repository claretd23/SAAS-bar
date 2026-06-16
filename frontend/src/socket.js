import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let socket = null;

export function connectSocket(businessId) {
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL);
  socket.on("connect", () => {
    socket.emit("join_business", businessId);
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