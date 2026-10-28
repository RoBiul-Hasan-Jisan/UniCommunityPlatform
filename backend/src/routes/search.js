import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Job from "../models/Job.js";
import Event from "../models/Event.js";
import Project from "../models/Project.js";
import Workshop from "../models/Workshop.js";
import { requireAuth } from "../middleware/auth.js";
import { searchLimiter } from "../middleware/rateLimiters.js";
import { escapeRegex } from "../middleware/validate.js";

const router = express.Router();

// One search box for the whole platform. Returns a few of each kind, grouped,
// so the UI can show sections ("People", "Jobs", ...). Uses MongoDB text
// indexes where they exist; workshops fall back to a safe, escaped regex.
router.get("/", requireAuth, searchLimiter, async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (q.length < 2) return res.json({ q, users: [], posts: [], jobs: [], events: [], projects: [], workshops: [] });
  const limit = Math.min(10, Math.max(1, parseInt(req.query.limit) || 5));
  const text = { $text: { $search: q } };
  const rx = new RegExp(escapeRegex(q), "i");
  const score = { score: { $meta: "textScore" } };

  const [users, posts, jobs, events, projects, workshops] = await Promise.all([
    User.find({ ...text, role: { $ne: "admin" }, status: { $ne: "disabled" } }, score)
      .select("name role department currentCompany currentPosition avatarUrl verified")
      .sort(score).limit(limit).lean(),
    Post.find({ ...text, isDeletedByAdmin: false }, score)
      .select("content category createdAt author hashtags")
      .populate("author", "name avatarUrl")
      .sort(score).limit(limit).lean(),
    Job.find({ ...text, isDeletedByAdmin: false, status: "open" }, score)
      .select("title company location type")
      .sort(score).limit(limit).lean(),
    Event.find({ ...text, isDeletedByAdmin: false }, score)
      .select("title date location mode")
      .sort(score).limit(limit).lean(),
    Project.find({ ...text, isDeletedByAdmin: false }, score)
      .select("title description techStack")
      .sort(score).limit(limit).lean(),
    Workshop.find({ $or: [{ title: rx }, { description: rx }], status: { $ne: "cancelled" } })
      .select("title date category status")
      .sort({ date: -1 }).limit(limit).lean(),
  ]);

  // Don't ship whole post bodies in a search dropdown.
  const trimmedPosts = posts.map((p) => ({ ...p, content: p.content.length > 160 ? `${p.content.slice(0, 160)}…` : p.content }));
  res.json({ q, users, posts: trimmedPosts, jobs, events, projects, workshops });
});

export default router;
