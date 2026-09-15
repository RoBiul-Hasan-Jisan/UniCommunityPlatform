import express from "express";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (!targetType || !targetId || !reason) return res.status(400).json({ error: "Missing fields" });
  const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason });
  await logActivity(req.user._id, `reported a ${targetType}`, targetType, targetId);
  res.status(201).json({ report });
});

export default router;
