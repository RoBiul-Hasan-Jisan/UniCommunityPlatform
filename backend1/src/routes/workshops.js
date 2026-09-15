import express from "express";
import Workshop from "../models/Workshop.js";
import Registration from "../models/Registration.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const { category, host, status } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (host) filter.host = host;
  if (status) filter.status = status;
  const workshops = await Workshop.find(filter).sort({ date: 1 }).populate("host", "name role currentCompany").lean();
  const withCounts = await Promise.all(
    workshops.map(async (w) => {
      const count = await Registration.countDocuments({ workshop: w._id, status: "registered" });
      return { ...w, registeredCount: count, seatsLeft: Math.max(w.maxParticipants - count, 0) };
    })
  );
  res.json({ workshops: withCounts });
});

router.get("/:id", requireAuth, async (req, res) => {
  const workshop = await Workshop.findById(req.params.id).populate("host", "name role currentCompany");
  if (!workshop) return res.status(404).json({ error: "Workshop not found" });
  const count = await Registration.countDocuments({ workshop: workshop._id, status: "registered" });
  res.json({ workshop: { ...workshop.toObject(), registeredCount: count, seatsLeft: Math.max(workshop.maxParticipants - count, 0) } });
});

// Only alumni + admin create workshops
router.post("/", requireAuth, requireRole("alumni", "admin"), async (req, res) => {
  const { title, description, category, date, time, durationMinutes, mode, location, maxParticipants, registrationDeadline } = req.body;
  if (!title || !description || !date || !time) return res.status(400).json({ error: "Missing required fields" });
  const workshop = await Workshop.create({
    title, description, category, date, time, durationMinutes, mode, location,
    maxParticipants: maxParticipants || 100,
    registrationDeadline,
    host: req.user._id,
  });
  await logActivity(req.user._id, "created a workshop", "Workshop", workshop._id);
  res.status(201).json({ workshop });
});

router.put("/:id", requireAuth, async (req, res) => {
  const workshop = await Workshop.findById(req.params.id);
  if (!workshop) return res.status(404).json({ error: "Workshop not found" });
  const isHost = String(workshop.host) === String(req.user._id);
  if (!isHost && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const allowed = ["title", "description", "category", "date", "time", "durationMinutes", "mode", "location", "maxParticipants", "registrationDeadline", "status"];
  for (const key of allowed) if (key in req.body) workshop[key] = req.body[key];
  await workshop.save();
  res.json({ workshop });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const workshop = await Workshop.findById(req.params.id);
  if (!workshop) return res.status(404).json({ error: "Workshop not found" });
  const isHost = String(workshop.host) === String(req.user._id);
  if (!isHost && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  await Workshop.findByIdAndDelete(workshop._id);
  await Registration.deleteMany({ workshop: workshop._id });
  res.json({ success: true });
});

// View registrations for a workshop (host or admin)
router.get("/:id/registrations", requireAuth, async (req, res) => {
  const workshop = await Workshop.findById(req.params.id);
  if (!workshop) return res.status(404).json({ error: "Workshop not found" });
  const isHost = String(workshop.host) === String(req.user._id);
  if (!isHost && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const registrations = await Registration.find({ workshop: workshop._id }).populate("participant", "name role department").lean();
  res.json({ registrations });
});

export default router;
