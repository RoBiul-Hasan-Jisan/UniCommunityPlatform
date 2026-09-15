const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { createMessage } = require("../utils/chatService");

// Socket.IO auth: reads the same httpOnly JWT cookie used by the REST API.
async function authenticateSocket(socket) {
  const raw = socket.handshake.headers.cookie;
  if (!raw) throw new Error("No auth cookie.");
  const parsed = cookie.parse(raw);
  const token = parsed.token;
  if (!token) throw new Error("No auth token.");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new Error("User not found.");
  return user;
}

function initSockets(io) {
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateSocket(socket);
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    // Join rooms for every conversation this user is part of, so
    // message:new / typing events reach them without extra queries.
    Conversation.find({ participantIds: userId }).then((conversations) => {
      conversations.forEach((c) => socket.join(`conversation:${c._id}`));
    });

    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("message:send", async ({ conversationId, text }, ack) => {
      try {
        if (!text || !text.trim()) return;
        const message = await createMessage(io, {
          conversationId,
          senderId: socket.user._id,
          text: text.trim(),
          type: "text",
        });
        io.to(`conversation:${conversationId}`).emit("message:new", message);
        if (ack) ack({ success: true, message });
      } catch (err) {
        if (ack) ack({ success: false, message: err.message });
      }
    });

    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:start", { userId, conversationId });
    });
    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { userId, conversationId });
    });

    socket.on("disconnect", () => {
      // no-op: rooms are cleaned up automatically by Socket.IO
    });
  });
}

module.exports = initSockets;
