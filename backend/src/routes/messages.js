import express from "express";
import { Conversation } from "../models/Message.js";
import Message from "../models/Message.js";
import Connection from "../models/Connection.js";
import { requireAuth } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";
import { getIO } from "../socket.js";
import { validate, validateObjectIdParams } from "../middleware/validate.js";
import { startConversationSchema, sendMessageSchema } from "../validators/index.js";
import { moderateBody } from "../utils/moderation.js";
import { messageLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();
router.param("conversationId", (req, res, next) => validateObjectIdParams("conversationId")(req, res, next));

async function areConnected(userA, userB) {
  const conn = await Connection.findOne({
    status: "accepted",
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });
  return !!conn;
}

// List my conversations
router.get("/", requireAuth, async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user._id })
    .populate("participants", "name role avatarUrl")
    .sort({ lastMessageAt: -1 })
    .lean();
  res.json({ conversations });
});

// Start or fetch a conversation with a connected user
router.post("/start", requireAuth, validate(startConversationSchema), async (req, res) => {
  const { userId } = req.body;
  if (String(userId) === String(req.user._id)) return res.status(400).json({ error: "You can't message yourself" });
  const connected = await areConnected(req.user._id, userId);
  if (!connected) return res.status(403).json({ error: "You can only chat with accepted connections" });

  let convo = await Conversation.findOne({ participants: { $all: [req.user._id, userId], $size: 2 } });
  if (!convo) convo = await Conversation.create({ participants: [req.user._id, userId] });
  res.json({ conversation: convo });
});

async function markConversationRead(convoId, userId) {
  const { modifiedCount } = await Message.updateMany(
    { conversation: convoId, sender: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
  // Let the sender's open thread update live with a "seen" indicator,
  // instead of them only finding out on their next page load.
  if (modifiedCount > 0) {
    getIO()?.to(`conversation:${convoId}`).emit("message:read", { conversationId: String(convoId), readerId: String(userId) });
  }
}

// Cursor pagination: returns the newest `limit` messages (oldest-first, ready
// to render), or — with ?before=<messageId> — the page of messages just older
// than that one. Opening a thread (no cursor) is what marks it read.
router.get("/:conversationId", requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.conversationId);
  if (!convo || !convo.participants.some((p) => String(p) === String(req.user._id))) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
  const filter = { conversation: convo._id };
  if (req.query.before) {
    const cursor = await Message.findOne({ _id: req.query.before, conversation: convo._id }).select("createdAt").lean();
    if (cursor) filter.$or = [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor._id } }];
  }
  const page = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
  const hasMore = page.length > limit;
  const messages = page.slice(0, limit).reverse();
  if (!req.query.before) await markConversationRead(convo._id, req.user._id);
  res.json({ messages, hasMore });
});

// A cheap, dedicated call for "I'm still looking at this thread and a new
// message just arrived live via socket" — the full GET above already marks
// things read on initial load, this covers messages that arrive afterward
// without needing to refetch the whole thread just to trigger that.
router.post("/:conversationId/read", requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.conversationId);
  if (!convo || !convo.participants.some((p) => String(p) === String(req.user._id))) {
    return res.status(403).json({ error: "Not allowed" });
  }
  await markConversationRead(convo._id, req.user._id);
  res.json({ success: true });
});

router.post("/:conversationId", requireAuth, messageLimiter, validate(sendMessageSchema), moderateBody("text"), async (req, res) => {
  const convo = await Conversation.findById(req.params.conversationId);
  if (!convo || !convo.participants.some((p) => String(p) === String(req.user._id))) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const { text, attachmentUrl } = req.body;
  const message = await Message.create({ conversation: convo._id, sender: req.user._id, text, attachmentUrl: attachmentUrl || "", readBy: [req.user._id] });
  convo.lastMessageAt = new Date();
  await convo.save();
  const other = convo.participants.find((p) => String(p) !== String(req.user._id));

  // Live-deliver the message to anyone with the thread open right now...
  getIO()?.to(`conversation:${convo._id}`).emit("message:new", { conversationId: String(convo._id), message });
  // ...and let the recipient's inbox list update even if the thread isn't open.
  if (other) {
    getIO()?.to(`user:${other}`).emit("conversation:update", { conversationId: String(convo._id), lastMessageAt: convo.lastMessageAt });
    await notify(other, "message", `New message from ${req.user.name}`, `/messages/${convo._id}`);
  }
  res.status(201).json({ message });
});

export default router;
