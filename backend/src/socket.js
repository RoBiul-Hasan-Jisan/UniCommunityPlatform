import { Server } from "socket.io";
import { authenticateToken } from "./middleware/auth.js";
import { Conversation } from "./models/Message.js";

let io = null;

export function initSocket(httpServer) {
  const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

  io = new Server(httpServer, {
    cors: { origin: allowedOrigin, credentials: true },
  });

  // Every socket must authenticate with the same bearer token used for REST
  // calls before it's allowed to join any room — no anonymous listeners.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = await authenticateToken(token);
      socket.userId = String(user._id);
      socket.userRole = user.role;
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Personal room for things only this user should see (notifications,
    // new messages while they're not looking at that specific thread).
    socket.join(`user:${socket.userId}`);
    // Shared room for anything genuinely public to every logged-in member —
    // the community feed.
    socket.join("feed");

    socket.on("join:conversation", async (conversationId) => {
      try {
        const convo = await Conversation.findById(conversationId).select("participants").lean();
        const isParticipant = convo?.participants?.some((p) => String(p) === socket.userId);
        if (isParticipant) socket.join(`conversation:${conversationId}`);
      } catch (_) {
        // ignore malformed ids
      }
    });

    socket.on("leave:conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing", ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing", {
        conversationId,
        userId: socket.userId,
        isTyping: !!isTyping,
      });
    });
  });

  return io;
}

export function getIO() {
  return io;
}
