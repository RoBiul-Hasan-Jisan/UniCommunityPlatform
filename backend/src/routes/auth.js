import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// List available demo accounts (safe fields only) so the frontend can show a picker
router.get("/demo-accounts", async (req, res) => {
  const users = await User.find({ isDemo: true }).select("name email role department currentPosition currentCompany").lean();
  res.json({ users });
});

// Log in instantly as a chosen demo user — no password, no Firebase.
router.post("/demo-login", async (req, res) => {
  const { userId } = req.body;
  const user = await User.findOne({ _id: userId, isDemo: true });
  if (!user) return res.status(404).json({ error: "Demo account not found" });
  const token = jwt.sign({ demo: true, userId: user._id }, process.env.DEMO_JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

// Returns the current authenticated user's profile (works for demo or Firebase auth)
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
