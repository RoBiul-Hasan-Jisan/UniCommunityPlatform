import express from "express";
import Job from "../models/Job.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLogger.js";
import { getIO } from "../socket.js";

const router = express.Router();

// Anyone signed in — student, alumni, or admin — can post a job or
// internship they've come across, so the board fills up from everyone,
// not just alumni. Open listings first, closed ones last.
router.get("/", requireAuth, async (req, res) => {
  const { q, type, category, status } = req.query;
  const filter = { isDeletedByAdmin: false };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (q) filter.$text = { $search: q };
  const jobs = await Job.find(filter)
    .sort({ status: 1, createdAt: -1 })
    .limit(200)
    .populate("postedBy", "name role currentCompany")
    .lean();
  res.json({ jobs });
});

// Jobs I've bookmarked — must come before "/:id" or Express would treat
// "mine" as an :id value.
router.get("/mine/saved", requireAuth, async (req, res) => {
  const jobs = await Job.find({ savedBy: req.user._id, isDeletedByAdmin: false })
    .sort({ createdAt: -1 })
    .populate("postedBy", "name role currentCompany")
    .lean();
  res.json({ jobs });
});

router.get("/:id", requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id).populate("postedBy", "name role currentCompany department");
  if (!job || job.isDeletedByAdmin) return res.status(404).json({ error: "Job not found" });
  res.json({ job });
});

router.post("/", requireAuth, async (req, res) => {
  const { title, company, location, type, category, description, requirements, salaryRange, applyLink, applyEmail, deadline } = req.body;
  if (!title?.trim() || !company?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "Title, company, and description are required" });
  }
  if (!applyLink?.trim() && !applyEmail?.trim()) {
    return res.status(400).json({ error: "Add a way to apply — a link or an email" });
  }
  const job = await Job.create({
    title, company, location, type, category, description,
    requirements: Array.isArray(requirements) ? requirements.filter(Boolean) : [],
    salaryRange, applyLink, applyEmail, deadline,
    postedBy: req.user._id,
  });
  await logActivity(req.user._id, "posted a job", "Job", job._id);
  const populated = await Job.findById(job._id).populate("postedBy", "name role currentCompany").lean();
  getIO()?.to("jobs").emit("job:new", populated);
  res.status(201).json({ job: populated });
});

router.put("/:id", requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const isOwner = String(job.postedBy) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const allowed = [
    "title", "company", "location", "type", "category", "description",
    "requirements", "salaryRange", "applyLink", "applyEmail", "deadline", "status",
  ];
  for (const key of allowed) if (key in req.body) job[key] = req.body[key];
  await job.save();
  const populated = await Job.findById(job._id).populate("postedBy", "name role currentCompany").lean();
  getIO()?.to("jobs").emit("job:updated", populated);
  res.json({ job: populated });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const isOwner = String(job.postedBy) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  if (req.user.role === "admin" && !isOwner) {
    job.isDeletedByAdmin = true;
    await job.save();
  } else {
    await Job.findByIdAndDelete(job._id);
  }
  getIO()?.to("jobs").emit("job:deleted", { jobId: job._id });
  res.json({ success: true });
});

router.post("/:id/save", requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const idx = job.savedBy.findIndex((u) => String(u) === String(req.user._id));
  if (idx >= 0) job.savedBy.splice(idx, 1);
  else job.savedBy.push(req.user._id);
  await job.save();
  res.json({ saved: idx < 0 });
});

export default router;
