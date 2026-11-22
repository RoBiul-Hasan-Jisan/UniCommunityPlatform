import express from "express";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLogger.js";
import { validate } from "../middleware/validate.js";
import { reportSchema } from "../validators/index.js";
import { writeLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.post("/", requireAuth, writeLimiter, validate(reportSchema), async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  // One open report per person per item — repeated clicks shouldn't flood the admin queue.
  const existing = await Report.findOne({ reporter: req.user._id, targetType, targetId, status: "open" });
  if (existing) return res.status(200).json({ report: existing, duplicate: true });
  const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason });
  await logActivity(req.user._id, `reported a ${targetType}`, targetType, targetId);
  res.status(201).json({ report });
});

export default router;
