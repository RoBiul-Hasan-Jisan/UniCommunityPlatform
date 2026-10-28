import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { requireAuth, verifyFirebaseToken } from "../middleware/auth.js";
import { isDemoEnabled, isUniversityEmail } from "../config/env.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, objectId } from "../validators/index.js";
import { z } from "zod";

const router = express.Router();

// Registration is a common target for scripted abuse (account enumeration,
// credential stuffing) — kept strict.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

// Demo login is meant to be used by a whole room of people at once, often
// from the same campus WiFi (one shared public IP for everyone). A strict
// per-IP limit here would lock out the 31st person in the room, not an
// attacker — so this one is sized for "a live demo full of people", not
// "a login form on the open internet".
const demoLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many demo logins from this network right now. Please wait a minute and try again." },
});

// List available demo accounts so the frontend can show a picker.
// Only non-sensitive, already-public-facing fields — no email addresses.
// Public, non-secret runtime flags the login page needs.
router.get("/config", (req, res) => {
  res.json({ demoEnabled: isDemoEnabled() });
});

// With demo mode off (the production default) these two routes behave as if they don't exist.
function requireDemoMode(req, res, next) {
  if (!isDemoEnabled()) return res.status(404).json({ error: "Not found" });
  next();
}

router.get("/demo-accounts", requireDemoMode, async (req, res) => {
  const users = await User.find({ isDemo: true })
    .select("name role department currentPosition currentCompany avatarUrl")
    .lean();
  res.json({ users });
});

// Log in instantly as a chosen demo user — no password, no Firebase.
router.post("/demo-login", requireDemoMode, demoLoginLimiter, validate(z.object({ userId: objectId })), async (req, res) => {
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
router.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
  const { idToken, role, department, name } = req.body;

  let decoded;
  try {
    decoded = await verifyFirebaseToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired sign-in token" });
  }

  const safeRole = role === "alumni" ? "alumni" : "student"; // allow-list, not a block-list

  // Check both firebaseUid (has this exact account already registered?) and
  // email (does some other account already use this email — e.g. an admin
  // created one manually, or a near-simultaneous double-click on "Create
  // account" beat this request here) before inserting, and treat the DB's
  // unique-index rejection as an expected outcome rather than a crash.
  let user = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email: decoded.email }] });
  if (!user) {
    try {
      user = await User.create({
        name: (name || decoded.name || decoded.email?.split("@")[0] || "New User").trim(),
        email: decoded.email,
        firebaseUid: decoded.uid,
        role: safeRole,
        department: department || "",
        verified: isUniversityEmail(decoded.email),
      });
    } catch (err) {
      if (err.code === 11000) {
        // Someone else's request (very likely a double-submitted click on
        // this exact form) won the race and created it first — that's fine,
        // just fetch and return the account that now exists instead of
        // erroring out.
        user = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email: decoded.email }] });
        if (!user) return res.status(409).json({ error: "An account with this email already exists. Try logging in instead." });
      } else {
        throw err;
      }
    }
  }
  res.status(201).json({ user });
});

// Returns the current authenticated user's profile (works for demo or Firebase auth)
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
