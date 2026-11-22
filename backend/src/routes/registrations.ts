import express from "express";
import Registration from "../models/Registration.js";
import Workshop from "../models/Workshop.js";
import { requireAuth } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

router.get("/mine", requireAuth, async (req, res) => {
  const registrations = await Registration.find({ participant: req.user._id })
    .populate({ path: "workshop", populate: { path: "host", select: "name" } })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ registrations });
});

router.post("/", requireAuth, async (req, res) => {
  const { workshopId } = req.body;
  const workshop = await Workshop.findById(workshopId);
  if (!workshop) return res.status(404).json({ error: "Workshop not found" });

  const count = await Registration.countDocuments({ workshop: workshopId, status: "registered" });
  if (count >= workshop.maxParticipants) return res.status(400).json({ error: "Workshop is full" });
  if (workshop.registrationDeadline && new Date() > new Date(workshop.registrationDeadline)) {
    return res.status(400).json({ error: "Registration deadline has passed" });
  }

  try {
    const registration = await Registration.create({ workshop: workshopId, participant: req.user._id, status: "registered" });
    await notify(req.user._id, "workshop_registration", `You registered for "${workshop.title}"`, `/workshops/${workshop._id}`);
    await notify(workshop.host, "workshop_registration", `${req.user.name} registered for "${workshop.title}"`, `/workshops/${workshop._id}`);
    await logActivity(req.user._id, `registered for ${workshop.title}`, "Workshop", workshop._id);
    res.status(201).json({ registration });
  } catch (err) {
    res.status(400).json({ error: "Already registered" });
  }
});

router.post("/:id/cancel", requireAuth, async (req, res) => {
  const registration = await Registration.findById(req.params.id);
  if (!registration) return res.status(404).json({ error: "Not found" });
  if (String(registration.participant) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not allowed" });
  }
  registration.status = "cancelled";
  await registration.save();
  res.json({ registration });
});

export default router;
