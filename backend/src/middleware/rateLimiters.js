import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Per-user when signed in (many students share one campus IP), per-IP otherwise.
const userOrIp = (req) => (req.user ? `u:${req.user._id}` : ipKeyGenerator(req.ip));

// A generous ceiling for normal use, tight enough to stop scripted spam —
// posting, commenting, and creating listings all share this. Sized for a
// person, not a bot: nobody legitimately posts 40 things in 15 minutes.
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're doing that a bit fast — please slow down and try again in a few minutes." },
});

// Comments are naturally higher-frequency than top-level posts/listings
// (a real conversation can have many replies quickly) — a bit more headroom.
export const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're commenting a bit fast — please slow down and try again in a few minutes." },
});

// Chat is far chattier than posting: allow a fast human conversation, block floods.
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userOrIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're sending messages very fast — please slow down a little." },
});

// Image uploads hit a paid third-party API, so keep them modest.
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: userOrIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads — please try again in a few minutes." },
});

// Global search runs several queries per call.
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: userOrIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Searching too fast — please wait a moment." },
});
