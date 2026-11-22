import express from "express";
import PushSubscription from "../models/PushSubscription.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { pushSubscriptionSchema } from "../validators/index.js";
import { pushEnabled } from "../utils/push.js";

const router = express.Router();

router.get("/public-key", requireAuth, (req, res) => {
  if (!pushEnabled()) return res.json({ enabled: false });
  res.json({ enabled: true, publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post("/subscribe", requireAuth, validate(pushSubscriptionSchema), async (req, res) => {
  if (!pushEnabled()) return res.status(503).json({ error: "Push notifications aren't configured on this server." });
  const { endpoint, keys } = req.body;
  await PushSubscription.findOneAndUpdate({ endpoint }, { user: req.user._id, endpoint, keys }, { upsert: true, new: true });
  res.status(201).json({ success: true });
});

router.post("/unsubscribe", requireAuth, async (req, res) => {
  if (req.body?.endpoint) await PushSubscription.deleteOne({ endpoint: req.body.endpoint, user: req.user._id });
  res.json({ success: true });
});

export default router;
