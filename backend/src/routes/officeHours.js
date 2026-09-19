import express from "express";
import OfficeHour from "../models/OfficeHour.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/activityLogger.js";
import { getIO } from "../socket.js";

const router = express.Router();

// Upcoming open slots, across all hosts — this is the "book a time" browse view.
router.get("/", requireAuth, async (req, res) => {
  const { host } = req.query;
  const filter = { status: "open", date: { $gte: new Date() } };
  if (host) filter.host = host;
  const slots = await OfficeHour.find(filter)
    .sort({ date: 1 })
    .limit(200)
    .populate("host", "name role currentCompany currentPosition department")
    .lean();
  res.json({ slots });
});

// My own slots — as a host (things I've offered) and as a student (things I've booked).
router.get("/mine", requireAuth, async (req, res) => {
  const [hosting, booked] = await Promise.all([
    OfficeHour.find({ host: req.user._id }).sort({ date: 1 }).populate("bookedBy", "name role department").lean(),
    OfficeHour.find({ bookedBy: req.user._id }).sort({ date: 1 }).populate("host", "name role currentCompany currentPosition").lean(),
  ]);
  res.json({ hosting, booked });
});

// Only alumni (and admins) offer time — mirrors who can host a workshop.
router.post("/", requireAuth, requireRole("alumni", "admin"), async (req, res) => {
  const { date, durationMinutes, topic, mode, location } = req.body;
  if (!date) return res.status(400).json({ error: "Pick a date and time" });
  if (new Date(date) < new Date()) return res.status(400).json({ error: "Pick a time in the future" });
  const slot = await OfficeHour.create({
    host: req.user._id, date, durationMinutes: durationMinutes || 30, topic: topic || "", mode: mode || "Online", location: location || "",
  });
  await logActivity(req.user._id, "offered office hours", "OfficeHour", slot._id);
  const populated = await OfficeHour.findById(slot._id).populate("host", "name role currentCompany currentPosition department").lean();
  getIO()?.to("office-hours").emit("officeHours:new", populated);
  res.status(201).json({ slot: populated });
});

router.post("/:id/book", requireAuth, async (req, res) => {
  const slot = await OfficeHour.findById(req.params.id);
  if (!slot) return res.status(404).json({ error: "Slot not found" });
  if (slot.status !== "open") return res.status(400).json({ error: "This slot is no longer available" });
  if (String(slot.host) === String(req.user._id)) return res.status(400).json({ error: "You can't book your own slot" });

  slot.status = "booked";
  slot.bookedBy = req.user._id;
  slot.bookingNote = req.body.note || "";
  await slot.save();
  await notify(slot.host, "office_hours_booked", `${req.user.name} booked your office hours slot`, "/office-hours");
  const populated = await OfficeHour.findById(slot._id).populate("host", "name role currentCompany currentPosition").populate("bookedBy", "name role department").lean();
  getIO()?.to("office-hours").emit("officeHours:updated", populated);
  res.json({ slot: populated });
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  const slot = await OfficeHour.findById(req.params.id);
  if (!slot) return res.status(404).json({ error: "Slot not found" });
  const isHost = String(slot.host) === String(req.user._id);
  const isBooker = slot.bookedBy && String(slot.bookedBy) === String(req.user._id);
  if (!isHost && !isBooker && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });

  const wasBooked = slot.status === "booked";
  if (isHost) {
    slot.status = "cancelled";
  } else {
    // A student cancelling just reopens the slot for someone else.
    slot.status = "open";
    slot.bookedBy = null;
    slot.bookingNote = "";
  }
  await slot.save();
  if (wasBooked) {
    const notifyTarget = isHost ? slot.bookedBy : slot.host;
    if (notifyTarget) await notify(notifyTarget, "office_hours_cancelled", `An office hours booking was cancelled`, "/office-hours");
  }
  getIO()?.to("office-hours").emit("officeHours:updated", slot);
  res.json({ slot });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const slot = await OfficeHour.findById(req.params.id);
  if (!slot) return res.status(404).json({ error: "Slot not found" });
  const isHost = String(slot.host) === String(req.user._id);
  if (!isHost && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  await OfficeHour.findByIdAndDelete(slot._id);
  getIO()?.to("office-hours").emit("officeHours:deleted", { slotId: slot._id });
  res.json({ success: true });
});

export default router;
