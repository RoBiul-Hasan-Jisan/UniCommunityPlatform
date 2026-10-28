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
import { notify } from "../utils/notify.js";
import { validateObjectIdParams, escapeRegex } from "../middleware/validate.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));
router.param("id", (req, res, next) => validateObjectIdParams("id")(req, res, next));

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
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i"); // user input is never used as a raw regex
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(500).select("-passwordHash").lean();
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
  await logActivity(req.user._id, `edited a user profile`, "User", user._id, { req, meta: { fields: Object.keys(updates).filter((k) => k !== "passwordHash") } });
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
  await logActivity(req.user._id, `deleted a user`, "User", req.params.id, { req, meta: { email: target.email, role: target.role } });
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
  await logActivity(req.user._id, `${user.status === "active" ? "activated" : "deactivated"} a user`, "User", user._id, { req });
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

// Who owns the reported thing? Used to warn / disable the right person.
async function resolveTarget(report) {
  const map = {
    post: [Post, "author"], comment: [Comment, "author"], job: [Job, "postedBy"],
    event: [Event, "host"], project: [Project, "author"], workshop: [Workshop, "host"],
  };
  if (report.targetType === "user") return { model: User, doc: await User.findById(report.targetId), ownerId: report.targetId };
  const entry = map[report.targetType];
  if (!entry) return { doc: null, ownerId: null };
  const [model, ownerField] = entry;
  const doc = await model.findById(report.targetId);
  return { doc, ownerId: doc?.[ownerField] || null };
}

// Body: { status: "resolved" | "dismissed", action?: "none" | "warn" | "hide" | "disable_user", note? }
//  - warn:         sends the content owner an in-app notice
//  - hide:         hides the reported content (comments are deleted outright)
//  - disable_user: deactivates the content owner's account (never an admin, never yourself)
router.post("/reports/:id/resolve", async (req, res) => {
  const status = req.body.status === "dismissed" ? "dismissed" : "resolved";
  const action = ["none", "warn", "hide", "disable_user"].includes(req.body.action) ? req.body.action : "none";
  const note = String(req.body.note || "").slice(0, 500);

  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });

  let actionTaken = "none";
  if (status === "resolved" && action !== "none") {
    const { doc, ownerId } = await resolveTarget(report);
    if (!doc) return res.status(404).json({ error: "The reported item no longer exists" });

    if (action === "warn" && ownerId) {
      await notify(ownerId, "admin", `An admin reviewed a report about your ${report.targetType} and asks you to follow the community guidelines.${note ? ` Note: ${note}` : ""}`);
      actionTaken = "warned";
    } else if (action === "hide") {
      if (report.targetType === "comment") await Comment.findByIdAndDelete(doc._id);
      else if (report.targetType === "user") return res.status(400).json({ error: "Users can't be hidden — use disable_user instead" });
      else if (report.targetType === "workshop") await Workshop.findByIdAndUpdate(doc._id, { status: "cancelled" });
      else { doc.isDeletedByAdmin = true; await doc.save(); }
      actionTaken = "content_hidden";
    } else if (action === "disable_user" && ownerId) {
      if (String(ownerId) === String(req.user._id)) return res.status(400).json({ error: "You can't disable your own account." });
      const owner = await User.findById(ownerId);
      if (owner?.role === "admin") return res.status(400).json({ error: "Admin accounts can't be disabled from a report." });
      if (owner) { owner.status = "disabled"; await owner.save(); }
      actionTaken = "user_disabled";
    }
  }

  report.status = status;
  report.actionTaken = actionTaken;
  report.resolutionNote = note;
  report.resolvedBy = req.user._id;
  await report.save();
  await logActivity(req.user._id, `${status} a report (${actionTaken})`, "Report", report._id, { req, meta: { targetType: report.targetType, targetId: report.targetId, note } });
  await notify(report.reporter, "report_update", `Thanks for your report — an admin reviewed it and marked it ${status}.`);
  res.json({ report });
});

// ---- Analytics (last N days of signups & activity, for the dashboard charts) ----
router.get("/analytics", async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30));
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));

  const perDay = (Model, extraMatch = {}) =>
    Model.aggregate([
      { $match: { createdAt: { $gte: since }, ...extraMatch } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]);

  const [users, posts, connections, registrations, roleSplit, openReports] = await Promise.all([
    perDay(User),
    perDay(Post, { isDeletedByAdmin: false }),
    perDay(Connection, { status: "accepted" }),
    perDay(Registration, { status: "registered" }),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Report.countDocuments({ status: "open" }),
  ]);

  // Fill gaps so charts get one point per day.
  const labels = [];
  for (let i = 0; i < days; i++) { const d = new Date(since); d.setDate(since.getDate() + i); labels.push(d.toISOString().slice(0, 10)); }
  const series = (rows) => { const m = new Map(rows.map((r) => [r._id, r.count])); return labels.map((l) => m.get(l) || 0); };

  res.json({
    days, labels,
    series: { signups: series(users), posts: series(posts), connections: series(connections), registrations: series(registrations) },
    roleSplit: Object.fromEntries(roleSplit.map((r) => [r._id, r.count])),
    openReports,
  });
});

// ---- CSV exports ----
// Cells that start with = + - @ can execute as formulas when opened in Excel;
// prefix them so exported user content can't do that.
function csvCell(v) {
  let str = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}
function sendCsv(res, filename, headers, rows) {
  const lines = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + lines.join("\r\n")); // BOM so Excel reads UTF-8 names correctly
}

router.get("/export/users.csv", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).select("-passwordHash").lean();
  await logActivity(req.user._id, "exported the users list", "User", null, { req, meta: { count: users.length } });
  sendCsv(res, "users.csv",
    ["Name", "Email", "Role", "Status", "Verified", "Department", "Batch", "Graduation year", "Company", "Position", "Location", "Joined"],
    users.map((u) => [u.name, u.email, u.role, u.status, u.verified ? "yes" : "no", u.department, u.batch, u.graduationYear, u.currentCompany, u.currentPosition, u.location, u.createdAt]));
});

router.get("/export/registrations.csv", async (req, res) => {
  const regs = await Registration.find().sort({ createdAt: -1 }).populate("workshop", "title date").populate("participant", "name email role").lean();
  await logActivity(req.user._id, "exported workshop registrations", "Registration", null, { req, meta: { count: regs.length } });
  sendCsv(res, "registrations.csv",
    ["Workshop", "Workshop date", "Participant", "Email", "Role", "Status", "Registered at"],
    regs.map((r) => [r.workshop?.title, r.workshop?.date, r.participant?.name, r.participant?.email, r.participant?.role, r.status, r.createdAt]));
});

router.get("/export/activity.csv", async (req, res) => {
  const rows = await Activity.find().sort({ createdAt: -1 }).limit(5000).populate("actor", "name email role").lean();
  sendCsv(res, "activity.csv",
    ["When", "Actor", "Email", "Role", "Action", "Target type", "Target id", "IP"],
    rows.map((a) => [a.createdAt, a.actor?.name, a.actor?.email, a.actor?.role, a.action, a.targetType, a.targetId, a.ip]));
});

// ---- Activity log ----
router.get("/activity", async (req, res) => {
  const activity = await Activity.find().sort({ createdAt: -1 }).limit(200).populate("actor", "name role").lean();
  res.json({ activity });
});

export default router;
