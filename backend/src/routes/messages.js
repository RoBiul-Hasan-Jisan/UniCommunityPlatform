import express from "express";
import { Conversation } from "../models/Message.js";
import Message from "../models/Message.js";
import Connection from "../models/Connection.js";
import { requireAuth } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

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
    .populate("participants", "name role")
    .sort({ lastMessageAt: -1 })
    .lean();
  res.json({ conversations });
});

// Start or fetch a conversation with a connected user
router.post("/start", requireAuth, async (req, res) => {
  const { userId } = req.body;
  const connected = await areConnected(req.user._id, userId);
  if (!connected) return res.status(403).json({ error: "You can only chat with accepted connections" });

  let convo = await Conversation.findOne({ participants: { $all: [req.user._id, userId], $size: 2 } });
  if (!convo) convo = await Conversation.create({ participants: [req.user._id, userId] });
  res.json({ conversation: convo });
});

router.get("/:conversationId", requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.conversationId);
  if (!convo || !convo.participants.some((p) => String(p) === String(req.user._id))) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const messages = await Message.find({ conversation: convo._id }).sort({ createdAt: 1 }).lean();
  await Message.updateMany(
    { conversation: convo._id, sender: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );
  res.json({ messages });
});

router.post("/:conversationId", requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.conversationId);
  if (!convo || !convo.participants.some((p) => String(p) === String(req.user._id))) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Message text required" });
  const message = await Message.create({ conversation: convo._id, sender: req.user._id, text, readBy: [req.user._id] });
  convo.lastMessageAt = new Date();
  await convo.save();
  const other = convo.participants.find((p) => String(p) !== String(req.user._id));
  if (other) await notify(other, "message", `New message from ${req.user.name}`, `/messages/${convo._id}`);
  res.status(201).json({ message });
});

export default router;
