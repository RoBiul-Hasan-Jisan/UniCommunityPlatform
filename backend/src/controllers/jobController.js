const JobPosting = require("../models/JobPosting");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/jobs
const listJobs = asyncHandler(async (req, res) => {
  const { jobType, company, location, q, page = 1, limit = 20 } = req.query;
  const filter = { status: "active" };
  if (jobType) filter.jobType = jobType;
  if (company) filter.company = new RegExp(company, "i");
  if (location) filter.location = new RegExp(location, "i");
  if (q) filter.title = new RegExp(q, "i");

  const skip = (Number(page) - 1) * Number(limit);
  const [jobs, total] = await Promise.all([
    JobPosting.find(filter).sort({ postedAt: -1 }).skip(skip).limit(Number(limit)),
    JobPosting.countDocuments(filter),
  ]);

  res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / Number(limit)), jobs });
});

// GET /api/jobs/:id
const getJob = asyncHandler(async (req, res) => {
  const job = await JobPosting.findById(req.params.id);
  if (!job) throw new ApiError(404, "Job posting not found.");
  res.json({ success: true, job });
});

// POST /api/jobs  (alumni or admin only)
// Mirrors CF-06 postJob.
const postJob = asyncHandler(async (req, res) => {
  const { title, company, location, jobType, description, applyLink } = req.body;

  if (!title || title.length > 200) throw new ApiError(400, "Valid title is required (max 200 chars).");
  if (!company) throw new ApiError(400, "company is required.");
  if (!location) throw new ApiError(400, "location is required.");
  if (!JobPosting.VALID_JOB_TYPES.includes(jobType)) {
    throw new ApiError(400, `jobType must be one of: ${JobPosting.VALID_JOB_TYPES.join(", ")}`);
  }
  if (!description) throw new ApiError(400, "description is required.");
  if (!applyLink) throw new ApiError(400, "applyLink is required.");

  const job = await JobPosting.create({
    postedByAlumniId: req.user._id,
    posterName: req.user.fullName,
    posterPhotoUrl: req.user.photoUrl,
    title,
    company,
    location,
    jobType,
    description,
    applyLink,
  });

  res.status(201).json({ success: true, job });
});

// PATCH /api/jobs/:id/close — poster or admin can close a listing
const closeJob = asyncHandler(async (req, res) => {
  const job = await JobPosting.findById(req.params.id);
  if (!job) throw new ApiError(404, "Job posting not found.");
  if (String(job.postedByAlumniId) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You can only close your own job postings.");
  }
  job.status = "closed";
  await job.save();
  res.json({ success: true, job });
});

module.exports = { listJobs, getJob, postJob, closeJob };
