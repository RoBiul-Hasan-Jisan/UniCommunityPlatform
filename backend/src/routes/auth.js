import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { requireAuth, verifyFirebaseToken } from "../middleware/auth.js";

const router = express.Router();

// Login/registration endpoints are a common target for scripted abuse
// (account enumeration, credential stuffing, spamming demo tokens) — throttle them.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

// List available demo accounts so the frontend can show a picker.
// Only non-sensitive, already-public-facing fields — no email addresses.
router.get("/demo-accounts", async (req, res) => {
  const users = await User.find({ isDemo: true })
    .select("name role department currentPosition currentCompany")
    .lean();
  res.json({ users });
});

// Log in instantly as a chosen demo user — no password, no Firebase.
router.post("/demo-login", authLimiter, async (req, res) => {
  const { userId } = req.body;
  const user = await User.findOne({ _id: userId, isDemo: true });
  if (!user) return res.status(404).json({ error: "Demo account not found" });
  const token = jwt.sign({ demo: true, userId: user._id }, process.env.DEMO_JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

// Complete registration right after Firebase account creation, so the person
// can choose their role. This is the ONLY place a role is ever assigned from
// client input, and it is hard-restricted to student/alumni — "admin" can
// never be requested here, no matter what a caller sends in the request body.
router.post("/register", authLimiter, async (req, res) => {
  const { idToken, role, department, name } = req.body;
  if (!idToken) return res.status(400).json({ error: "Missing ID token" });

  let decoded;
  try {
    decoded = await verifyFirebaseToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired sign-in token" });
  }

  const safeRole = role === "alumni" ? "alumni" : "student"; // allow-list, not a block-list

  let user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    user = await User.create({
      name: (name || decoded.name || decoded.email?.split("@")[0] || "New User").trim(),
      email: decoded.email,
      firebaseUid: decoded.uid,
      role: safeRole,
      department: department || "",
    });
  }
  res.status(201).json({ user });
});

// Returns the current authenticated user's profile (works for demo or Firebase auth)
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
