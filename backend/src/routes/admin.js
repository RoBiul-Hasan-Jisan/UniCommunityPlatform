import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Post, { Comment } from "../models/Post.js";
import Workshop from "../models/Workshop.js";
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
  const [totalStudents, totalAlumni, totalUsers, totalWorkshops, totalRegistrations, totalPosts, totalConnections, totalMentorship] =
    await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "alumni" }),
      User.countDocuments({}),
      Workshop.countDocuments({}),
      Registration.countDocuments({ status: "registered" }),
      Post.countDocuments({ isDeletedByAdmin: false }),
      Connection.countDocuments({ status: "accepted" }),
      Mentorship.countDocuments({}),
    ]);

  const [recentUsers, recentPosts, recentWorkshops, recentActivity] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(8).select("name role department createdAt").lean(),
    Post.find({ isDeletedByAdmin: false }).sort({ createdAt: -1 }).limit(8).populate("author", "name").lean(),
    Workshop.find().sort({ createdAt: -1 }).limit(8).populate("host", "name").lean(),
    Activity.find().sort({ createdAt: -1 }).limit(15).populate("actor", "name role").lean(),
  ]);

  res.json({
    totals: { totalStudents, totalAlumni, totalUsers, totalWorkshops, totalRegistrations, totalPosts, totalConnections, totalMentorship },
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
  const updates = { ...rest };
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "Not found" });
  await logActivity(req.user._id, `edited a user profile`, "User", user._id);
  res.json({ user });
});

router.delete("/users/:id", async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  await logActivity(req.user._id, `deleted a user`, "User", req.params.id);
  res.json({ success: true });
});

router.post("/users/:id/toggle-status", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
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
