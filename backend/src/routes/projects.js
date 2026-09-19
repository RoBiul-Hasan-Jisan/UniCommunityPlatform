import express from "express";
import Project from "../models/Project.js";
import { requireAuth } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/activityLogger.js";
import { getIO } from "../socket.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const { q, tech, author } = req.query;
  const filter = { isDeletedByAdmin: false };
  if (tech) filter.techStack = tech;
  if (author) filter.author = author;
  if (q) filter.$text = { $search: q };
  const projects = await Project.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("author", "name role department currentCompany")
    .lean();
  res.json({ projects });
});

router.get("/:id", requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id).populate("author", "name role department currentCompany currentPosition");
  if (!project || project.isDeletedByAdmin) return res.status(404).json({ error: "Project not found" });
  res.json({ project });
});

router.post("/", requireAuth, async (req, res) => {
  const { title, description, techStack, link, repoLink } = req.body;
  if (!title?.trim() || !description?.trim()) return res.status(400).json({ error: "Title and description are required" });
  const project = await Project.create({
    title, description,
    techStack: Array.isArray(techStack) ? techStack.filter(Boolean) : [],
    link: link || "", repoLink: repoLink || "",
    author: req.user._id,
  });
  await logActivity(req.user._id, "shared a project", "Project", project._id);
  const populated = await Project.findById(project._id).populate("author", "name role department currentCompany").lean();
  getIO()?.to("projects").emit("project:new", populated);
  res.status(201).json({ project: populated });
});

router.put("/:id", requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const isOwner = String(project.author) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const allowed = ["title", "description", "techStack", "link", "repoLink"];
  for (const key of allowed) if (key in req.body) project[key] = req.body[key];
  await project.save();
  const populated = await Project.findById(project._id).populate("author", "name role department currentCompany").lean();
  getIO()?.to("projects").emit("project:updated", populated);
  res.json({ project: populated });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const isOwner = String(project.author) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  if (req.user.role === "admin" && !isOwner) {
    project.isDeletedByAdmin = true;
    await project.save();
  } else {
    await Project.findByIdAndDelete(project._id);
  }
  getIO()?.to("projects").emit("project:deleted", { projectId: project._id });
  res.json({ success: true });
});

router.post("/:id/star", requireAuth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const idx = project.stars.findIndex((u) => String(u) === String(req.user._id));
  if (idx >= 0) {
    project.stars.splice(idx, 1);
  } else {
    project.stars.push(req.user._id);
    if (String(project.author) !== String(req.user._id)) {
      await notify(project.author, "project_star", `${req.user.name} starred your project "${project.title}"`, `/projects/${project._id}`);
    }
  }
  await project.save();
  getIO()?.to("projects").emit("project:starred", { projectId: project._id, stars: project.stars });
  res.json({ stars: project.stars });
});

export default router;
