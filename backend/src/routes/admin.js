import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Post, { Comment } from "../models/Post.js";
import Workshop from "../models/Workshop.js";
import Job from "../models/Job.js";
import OfficeHour from "../models/OfficeHour.js";
import Project from "../models/Project.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Connection from "../models/Connection.js";
import Mentorship from "../models/Mentorship.js";
import Report from "../models/Report.js";
import Activity from "../models/Activity.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

// ---- Dashboard ----
router.get("/dashboard", async (req, res) => {
  const [totalStudents, totalAlumni, totalUsers, totalWorkshops, totalRegistrations, totalPosts, totalConnections, totalMentorship, totalJobs, totalOfficeHours, totalProjects, totalEvents] =
    await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "alumni" }),
      User.countDocuments({}),
      Workshop.countDocuments({}),
      Registration.countDocuments({ status: "registered" }),
      Post.countDocuments({ isDeletedByAdmin: false }),
      Connection.countDocuments({ status: "accepted" }),
      Mentorship.countDocuments({}),
      Job.countDocuments({ isDeletedByAdmin: false }),
      OfficeHour.countDocuments({}),
      Project.countDocuments({ isDeletedByAdmin: false }),
      Event.countDocuments({ isDeletedByAdmin: false }),
    ]);

  const [recentUsers, recentPosts, recentWorkshops, recentActivity] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(8).select("name role department createdAt").lean(),
    Post.find({ isDeletedByAdmin: false }).sort({ createdAt: -1 }).limit(8).populate("author", "name").lean(),
    Workshop.find().sort({ createdAt: -1 }).limit(8).populate("host", "name").lean(),
    Activity.find().sort({ createdAt: -1 }).limit(15).populate("actor", "name role").lean(),
  ]);

  res.json({
    totals: { totalStudents, totalAlumni, totalUsers, totalWorkshops, totalRegistrations, totalPosts, totalConnections, totalMentorship, totalJobs, totalOfficeHours, totalProjects, totalEvents },
    recentUsers, recentPosts, recentWorkshops, recentActivity,
  });
});

// ---- User management ----
router.get("/users", async (req, res) => {
  const { q, role } = req.query;
  const filter = {};
  if (role && role !== "all") filter.role = role;
  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }];
  const users = await User.find(filter).sort({ createdAt: -1 }).select("-passwordHash").lean();
  res.json({ users });
});

router.post("/users", async (req, res) => {
  const { name, email, role, password, ...rest } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: "Missing fields" });
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  const user = await User.create({ name, email, role, passwordHash, isDemo: false, ...rest });
  await logActivity(req.user._id, `added a new ${role}`, "User", user._id);
  res.status(201).json({ user });
});

router.get("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user });
});

router.put("/users/:id", async (req, res) => {
  const { password, ...rest } = req.body;
  const isSelf = String(req.params.id) === String(req.user._id);
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: "Not found" });

  // Never let an admin accidentally strip their own admin access, or the
  // last admin in the system lose it — that would lock everyone out of
  // the admin console with no way back in short of a database edit.
  if (rest.role && rest.role !== "admin" && target.role === "admin") {
    if (isSelf) return res.status(400).json({ error: "You can't remove your own admin role." });
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) return res.status(400).json({ error: "Can't remove the last remaining admin." });
  }
  if (isSelf && rest.status === "disabled") {
    return res.status(400).json({ error: "You can't disable your own account." });
  }

  const updates = { ...rest };
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-passwordHash");
  await logActivity(req.user._id, `edited a user profile`, "User", user._id);
  res.json({ user });
});

router.delete("/users/:id", async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ error: "You can't delete your own account." });
  }
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: "Not found" });
  if (target.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) return res.status(400).json({ error: "Can't delete the last remaining admin." });
  }
  await User.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, `deleted a user`, "User", req.params.id);
  res.json({ success: true });
});

router.post("/users/:id/toggle-status", async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ error: "You can't disable your own account." });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  if (user.role === "admin" && user.status === "active") {
    const adminCount = await User.countDocuments({ role: "admin", status: "active" });
    if (adminCount <= 1) return res.status(400).json({ error: "Can't disable the last active admin." });
  }
  user.status = user.status === "active" ? "disabled" : "active";
  await user.save();
  await logActivity(req.user._id, `${user.status === "active" ? "activated" : "deactivated"} a user`, "User", user._id);
  res.json({ user });
});

// ---- Posts moderation ----
router.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).populate("author", "name role").lean();
  res.json({ posts });
});

router.delete("/posts/:id", async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, "deleted a post", "Post", req.params.id);
  res.json({ success: true });
});

router.delete("/comments/:id", async (req, res) => {
  await Comment.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, "deleted a comment", "Comment", req.params.id);
  res.json({ success: true });
});

// ---- Workshops ----
router.get("/workshops", async (req, res) => {
  const workshops = await Workshop.find().sort({ createdAt: -1 }).populate("host", "name role").lean();
  res.json({ workshops });
});

router.delete("/workshops/:id", async (req, res) => {
  await Workshop.findByIdAndDelete(req.params.id);
  await Registration.deleteMany({ workshop: req.params.id });
  await logActivity(req.user._id, "deleted a workshop", "Workshop", req.params.id);
  res.json({ success: true });
});

// ---- Jobs ----
router.get("/jobs", async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).populate("postedBy", "name role").lean();
  res.json({ jobs });
});

router.delete("/jobs/:id", async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, "deleted a job posting", "Job", req.params.id);
  res.json({ success: true });
});

// ---- Office Hours ----
router.get("/office-hours", async (req, res) => {
  const slots = await OfficeHour.find().sort({ date: -1 }).populate("host", "name role").populate("bookedBy", "name role").lean();
  res.json({ slots });
});

router.delete("/office-hours/:id", async (req, res) => {
  await OfficeHour.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, "deleted an office hours slot", "OfficeHour", req.params.id);
  res.json({ success: true });
});

// ---- Projects ----
router.get("/projects", async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 }).populate("author", "name role").lean();
  res.json({ projects });
});

router.delete("/projects/:id", async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, "deleted a project", "Project", req.params.id);
  res.json({ success: true });
});

// ---- Events ----
router.get("/events", async (req, res) => {
  const events = await Event.find().sort({ date: -1 }).populate("host", "name role").lean();
  res.json({ events });
});

router.delete("/events/:id", async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, "deleted an event", "Event", req.params.id);
  res.json({ success: true });
});

// ---- Registrations ----
router.get("/registrations", async (req, res) => {
  const registrations = await Registration.find()
    .sort({ createdAt: -1 })
    .populate("workshop", "title")
    .populate("participant", "name role")
    .lean();
  res.json({ registrations });
});

// ---- Connections ----
router.get("/connections", async (req, res) => {
  const connections = await Connection.find()
    .sort({ createdAt: -1 })
    .populate("requester", "name role")
    .populate("recipient", "name role")
    .lean();
  res.json({ connections });
});

router.delete("/connections/:id", async (req, res) => {
  await Connection.findByIdAndDelete(req.params.id);
  await logActivity(req.user._id, "removed a connection", "Connection", req.params.id);
  res.json({ success: true });
});

// ---- Mentorship ----
router.get("/mentorship", async (req, res) => {
  const requests = await Mentorship.find()
    .sort({ createdAt: -1 })
    .populate("student", "name")
    .populate("alumni", "name")
    .lean();
  res.json({ requests });
});

// ---- Reports ----
router.get("/reports", async (req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).populate("reporter", "name role").lean();
  res.json({ reports });
});

router.post("/reports/:id/resolve", async (req, res) => {
  const { status } = req.body; // resolved | dismissed
  const report = await Report.findByIdAndUpdate(req.params.id, { status: status || "resolved" }, { new: true });
  await logActivity(req.user._id, `${status || "resolved"} a report`, "Report", req.params.id);
  res.json({ report });
});

// ---- Activity log ----
router.get("/activity", async (req, res) => {
  const activity = await Activity.find().sort({ createdAt: -1 }).limit(200).populate("actor", "name role").lean();
  res.json({ activity });
});

export default router;
