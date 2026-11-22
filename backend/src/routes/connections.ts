import express from "express";
import Connection from "../models/Connection.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

// My connections + pending requests
router.get("/", requireAuth, async (req, res) => {
  const me = req.user._id;
  const all = await Connection.find({ $or: [{ requester: me }, { recipient: me }] })
    .populate("requester", "name role department currentPosition")
    .populate("recipient", "name role department currentPosition")
    .sort({ createdAt: -1 })
    .lean();
  const accepted = all.filter((c) => c.status === "accepted");
  const incomingPending = all.filter((c) => c.status === "pending" && String(c.recipient._id) === String(me));
  const outgoingPending = all.filter((c) => c.status === "pending" && String(c.requester._id) === String(me));
  res.json({ accepted, incomingPending, outgoingPending });
});

router.post("/request", requireAuth, async (req, res) => {
  const { recipientId } = req.body;
  if (String(recipientId) === String(req.user._id)) return res.status(400).json({ error: "Cannot connect to yourself" });

  // Admin accounts run the platform, they aren't part of the student/alumni
  // networking graph — nobody can send them a request, and (since only
  // admins can even reach this as req.user) an admin can't send one either.
  if (req.user.role === "admin") {
    return res.status(403).json({ error: "Admin accounts don't send or receive connection requests" });
  }
  const recipient = await User.findById(recipientId).select("role");
  if (!recipient) return res.status(404).json({ error: "User not found" });
  if (recipient.role === "admin") {
    return res.status(403).json({ error: "Admin accounts don't send or receive connection requests" });
  }

  try {
    const conn = await Connection.create({ requester: req.user._id, recipient: recipientId, status: "pending" });
    await notify(recipientId, "connection_request", `${req.user.name} sent you a connection request`, "/network");
    await logActivity(req.user._id, "sent a connection request", "Connection", conn._id);
    res.status(201).json({ connection: conn });
  } catch (err) {
    res.status(400).json({ error: "Request already exists" });
  }
});

router.post("/:id/accept", requireAuth, async (req, res) => {
  const conn = await Connection.findById(req.params.id);
  if (!conn) return res.status(404).json({ error: "Not found" });
  if (String(conn.recipient) !== String(req.user._id)) return res.status(403).json({ error: "Not allowed" });
  conn.status = "accepted";
  await conn.save();
  await notify(conn.requester, "connection_accepted", `${req.user.name} accepted your connection request`, "/network");
  await logActivity(req.user._id, "connected with a member", "Connection", conn._id);
  res.json({ connection: conn });
});

router.post("/:id/reject", requireAuth, async (req, res) => {
  const conn = await Connection.findById(req.params.id);
  if (!conn) return res.status(404).json({ error: "Not found" });
  if (String(conn.recipient) !== String(req.user._id)) return res.status(403).json({ error: "Not allowed" });
  conn.status = "rejected";
  await conn.save();
  res.json({ connection: conn });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const conn = await Connection.findById(req.params.id);
  if (!conn) return res.status(404).json({ error: "Not found" });
  const isParty = [String(conn.requester), String(conn.recipient)].includes(String(req.user._id));
  if (!isParty && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  await Connection.findByIdAndDelete(conn._id);
  res.json({ success: true });
});

export default router;
