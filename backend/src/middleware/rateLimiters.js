import rateLimit from "express-rate-limit";

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
