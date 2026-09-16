import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { authenticateToken } from "./middleware/auth.js";
import { Conversation } from "./models/Message.js";

let io = null;

// Optional Redis pub/sub adapter — this is what lets you run 2-3 backend
// instances behind a load balancer later without rewriting anything here.
// Without it, Socket.IO keeps rooms in-memory on a single process, which is
// exactly fine for one server (a 100-person demo doesn't need this). Setting
// REDIS_URL turns it on; leaving it unset keeps today's behavior unchanged.
async function attachRedisAdapter(io) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("Socket.IO: no REDIS_URL set — running with the in-memory adapter (fine for a single instance).");
    return;
  }

  // node-redis retries forever by default — if REDIS_URL is wrong or Redis
  // is briefly unreachable, that would hang server startup indefinitely.
  // Give it a bounded number of quick retries, then give up and fall back.
  const socketOptions = {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => (retries > 3 ? false : Math.min(retries * 500, 1500)),
  };
  const pubClient = createClient({ url: redisUrl, socket: socketOptions });
  const subClient = pubClient.duplicate();

  // A flaky/unreachable Redis should never take the whole app down — log it
  // and keep serving on the in-memory adapter instead of crashing.
  pubClient.on("error", (err) => console.error("Redis (pub) error:", err.message));
  subClient.on("error", (err) => console.error("Redis (sub) error:", err.message));

  try {
    await Promise.all([
      withTimeout(pubClient.connect(), 8000, "Redis pub connect timed out"),
      withTimeout(subClient.connect(), 8000, "Redis sub connect timed out"),
    ]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.IO: connected to Redis — ready to run multiple backend instances behind a load balancer.");
  } catch (err) {
    console.error("Socket.IO: could not connect to Redis, falling back to the in-memory adapter:", err.message);
    // Stop them from continuing to retry in the background once we've given up.
    // The client may have already self-closed after exhausting reconnectStrategy,
    // so disconnecting a closed client is expected and safe to ignore.
    pubClient.removeAllListeners("error");
    subClient.removeAllListeners("error");
    if (pubClient.isOpen) await pubClient.disconnect().catch(() => {});
    if (subClient.isOpen) await subClient.disconnect().catch(() => {});
  }
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export async function initSocket(httpServer) {
  const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

  io = new Server(httpServer, {
    cors: { origin: allowedOrigin, credentials: true },
  });

  await attachRedisAdapter(io);

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

  io.on("connection", async (socket) => {
    // Personal room for things only this user should see (notifications,
    // new messages while they're not looking at that specific thread).
    const userRoom = `user:${socket.userId}`;

    // Was this user already connected from another tab/device? Check BEFORE
    // this socket joins, so we only announce "online" on a true 0→1
    // transition. fetchSockets() is adapter-aware, so this stays correct
    // even once REDIS_URL is set and this runs across several instances.
    const existing = await io.in(userRoom).fetchSockets();
    const wasOffline = existing.length === 0;

    socket.join(userRoom);
    // Shared room for anything genuinely public to every logged-in member —
    // the community feed, and presence broadcasts.
    socket.join("feed");

    if (wasOffline) {
      io.to("feed").emit("presence:online", { userId: socket.userId });
    }

    // Let a page ask "which of these people are online right now?" once,
    // on load, rather than waiting to observe every transition live.
    socket.on("presence:query", async (userIds, ack) => {
      if (typeof ack !== "function") return;
      if (!Array.isArray(userIds) || userIds.length === 0) return ack([]);
      const ids = [...new Set(userIds)].slice(0, 200).map(String);
      const online = await Promise.all(
        ids.map(async (id) => ((await io.in(`user:${id}`).fetchSockets()).length > 0 ? id : null))
      );
      ack(online.filter(Boolean));
    });

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

    socket.on("disconnect", () => {
      // A short grace period smooths over quick reconnects (a page
      // navigation, a brief WiFi blip, a server restart) so the dot doesn't
      // flicker offline-then-online for something that was never really a
      // disconnect from the person's point of view.
      setTimeout(async () => {
        const remaining = await io.in(userRoom).fetchSockets();
        if (remaining.length === 0) {
          io.to("feed").emit("presence:offline", { userId: socket.userId });
        }
      }, 4000);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
