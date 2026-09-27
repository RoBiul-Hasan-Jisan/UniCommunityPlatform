import express from "express";
import Job from "../models/Job.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimiters.js";
import { logActivity } from "../utils/activityLogger.js";
import { notify } from "../utils/notify.js";
import { getIO } from "../socket.js";

const router = express.Router();

// Anyone signed in — student, alumni, or admin — can post a job or
// internship they've come across, so the board fills up from everyone,
// not just alumni. Open listings first, closed ones last.
router.get("/", requireAuth, async (req, res) => {
  const { q, type, category, status, referral } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const filter = { isDeletedByAdmin: false };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (referral === "true") filter.referralAvailable = true;
  if (q) filter.$text = { $search: q };
  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort({ status: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("postedBy", "name role currentCompany")
      .lean(),
    Job.countDocuments(filter),
  ]);
  res.json({ jobs, page, hasMore: page * limit < total, total });
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
  const job = await Job.findById(req.params.id)
    .populate("postedBy", "name role currentCompany department")
    .populate("referralRequests.requester", "name role department currentCompany");
  if (!job || job.isDeletedByAdmin) return res.status(404).json({ error: "Job not found" });
  res.json({ job });
});

router.post("/", requireAuth, writeLimiter, async (req, res) => {
  const { title, company, location, type, category, description, requirements, salaryRange, applyLink, applyEmail, deadline, referralAvailable, referralNote } = req.body;
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
    referralAvailable: !!referralAvailable, referralNote: referralNote || "",
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
    "referralAvailable", "referralNote",
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

// Referral board: request a referral from whoever posted this job.
router.post("/:id/request-referral", requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (!job.referralAvailable) return res.status(400).json({ error: "This job isn't offering referrals" });
  if (String(job.postedBy) === String(req.user._id)) return res.status(400).json({ error: "You can't request a referral from yourself" });
  const already = job.referralRequests.find((r) => String(r.requester) === String(req.user._id));
  if (already) return res.status(400).json({ error: "You've already requested a referral for this job" });

  job.referralRequests.push({ requester: req.user._id, message: req.body.message || "" });
  await job.save();
  await notify(job.postedBy, "referral_request", `${req.user.name} requested a referral for ${job.title}`, `/jobs/${job._id}`);
  const populated = await Job.findById(job._id).populate("referralRequests.requester", "name role department currentCompany").lean();
  res.status(201).json({ referralRequests: populated.referralRequests });
});

router.post("/:id/referrals/:requesterId/respond", requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  const isOwner = String(job.postedBy) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const { status } = req.body;
  if (!["accepted", "declined"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  const reqEntry = job.referralRequests.find((r) => String(r.requester) === String(req.params.requesterId));
  if (!reqEntry) return res.status(404).json({ error: "Referral request not found" });
  reqEntry.status = status;
  await job.save();
  await notify(reqEntry.requester, "referral_update", `Your referral request for ${job.title} was ${status}`, `/jobs/${job._id}`);
  const populated = await Job.findById(job._id).populate("referralRequests.requester", "name role department currentCompany").lean();
  res.json({ referralRequests: populated.referralRequests });
});

export default router;
