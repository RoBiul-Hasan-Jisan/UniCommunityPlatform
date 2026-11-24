import { io } from "socket.io-client";

// The REST base is ".../api" — the WebSocket server lives at the root of the
// same host, so strip that suffix rather than requiring a second env var.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";
const SOCKET_BASE = API_BASE.replace(/\/api\/?$/, "");

let socket = null;

// Created once, lazily, so importing this module never opens a connection
// by itself — only connectSocket() (called from AuthContext once we know
// who's logged in) does that.
function getSocket() {
  if (!socket) {
    socket = io(SOCKET_BASE, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export { getSocket };
