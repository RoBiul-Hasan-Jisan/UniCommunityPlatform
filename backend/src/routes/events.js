import express from "express";
import Event from "../models/Event.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimiters.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/activityLogger.js";
import { getIO } from "../socket.js";
import { validate, validateObjectIdParams } from "../middleware/validate.js";
import { eventSchema } from "../validators/index.js";
import { moderateBody } from "../utils/moderation.js";

const router = express.Router();
router.param("id", (req, res, next) => validateObjectIdParams("id")(req, res, next));

router.get("/", requireAuth, async (req, res) => {
  const { category, q } = req.query;
  const filter = { isDeletedByAdmin: false, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } };
  if (category) filter.category = category;
  if (q) filter.$text = { $search: q };
  const events = await Event.find(filter)
    .sort({ date: 1 })
    .limit(200)
    .populate("host", "name role currentCompany department avatarUrl")
    .lean();
  res.json({ events });
});

router.get("/:id", requireAuth, async (req, res) => {
  const event = await Event.findById(req.params.id).populate("host", "name role currentCompany department avatarUrl").populate("rsvps", "name role department avatarUrl");
  if (!event || event.isDeletedByAdmin) return res.status(404).json({ error: "Event not found" });
  res.json({ event });
});

router.post("/", requireAuth, writeLimiter, validate(eventSchema), moderateBody("title", "description"), async (req, res) => {
  const { title, description, date, time, mode, location, category, capacity } = req.body;
  const event = await Event.create({
    title, description, date, time: time || "", mode: mode || "In-person", location: location || "",
    category: category || "Other", capacity: Number(capacity) || 0, host: req.user._id,
  });
  await logActivity(req.user._id, "created an event", "Event", event._id);
  const populated = await Event.findById(event._id).populate("host", "name role currentCompany department avatarUrl").lean();
  getIO()?.to("events").emit("event:new", populated);
  res.status(201).json({ event: populated });
});

router.put("/:id", requireAuth, validate(eventSchema.partial()), async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const isOwner = String(event.host) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const allowed = ["title", "description", "date", "time", "mode", "location", "category", "capacity"];
  for (const key of allowed) if (key in req.body) event[key] = req.body[key];
  if ("date" in req.body) event.reminderSent = false; // new date => new reminder
  await event.save();
  const populated = await Event.findById(event._id).populate("host", "name role currentCompany department avatarUrl").lean();
  getIO()?.to("events").emit("event:updated", populated);
  res.json({ event: populated });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const isOwner = String(event.host) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  if (req.user.role === "admin" && !isOwner) {
    event.isDeletedByAdmin = true;
    await event.save();
  } else {
    await Event.findByIdAndDelete(event._id);
  }
  getIO()?.to("events").emit("event:deleted", { eventId: event._id });
  res.json({ success: true });
});

router.post("/:id/rsvp", requireAuth, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const idx = event.rsvps.findIndex((u) => String(u) === String(req.user._id));
  if (idx >= 0) {
    event.rsvps.splice(idx, 1);
  } else {
    if (event.capacity > 0 && event.rsvps.length >= event.capacity) {
      return res.status(400).json({ error: "This event is full" });
    }
    event.rsvps.push(req.user._id);
    if (String(event.host) !== String(req.user._id)) {
      await notify(event.host, "event_rsvp", `${req.user.name} RSVP'd to ${event.title}`, `/events/${event._id}`);
    }
  }
  await event.save();
  getIO()?.to("events").emit("event:rsvp", { eventId: event._id, rsvps: event.rsvps });
  res.json({ rsvps: event.rsvps });
});

export default router;
