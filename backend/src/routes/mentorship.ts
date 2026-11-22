import express from "express";
import Mentorship from "../models/Mentorship.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

// Requests I sent (student) or received (alumni)
router.get("/", requireAuth, async (req, res) => {
  const filter = req.user.role === "alumni" ? { alumni: req.user._id } : { student: req.user._id };
  const requests = await Mentorship.find(filter)
    .populate("student", "name department batch")
    .populate("alumni", "name currentCompany currentPosition")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ requests });
});

router.post("/", requireAuth, requireRole("student"), async (req, res) => {
  const { alumniId, topic, message } = req.body;
  if (!alumniId || !topic || !message) return res.status(400).json({ error: "Missing fields" });
  const request = await Mentorship.create({ student: req.user._id, alumni: alumniId, topic, message });
  await notify(alumniId, "mentorship_request", `${req.user.name} requested guidance on "${topic}"`, "/mentorship");
  await logActivity(req.user._id, "requested mentorship", "Mentorship", request._id);
  res.status(201).json({ request });
});

router.post("/:id/respond", requireAuth, async (req, res) => {
  const request = await Mentorship.findById(req.params.id);
  if (!request) return res.status(404).json({ error: "Not found" });
  const { status, text } = req.body; // status: accepted | rejected | closed
  const isAlumni = String(request.alumni) === String(req.user._id);
  const isStudent = String(request.student) === String(req.user._id);
  if (!isAlumni && !isStudent && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });

  if (status && isAlumni) request.status = status;
  if (text?.trim()) {
    request.responses.push({ author: req.user._id, text });
    const recipient = isAlumni ? request.student : request.alumni;
    await notify(recipient, "mentorship_update", `New reply on your mentorship request`, "/mentorship");
  }
  await request.save();
  res.json({ request });
});

export default router;
