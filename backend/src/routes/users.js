import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Fields any authenticated community member is allowed to see about another
// user. Internal/auth-linkage fields (firebaseUid, isDemo, status, passwordHash,
// email) are deliberately excluded — they are never sent to the browser for
// anyone but the account owner (see /me and /users/me).
const PUBLIC_PROFILE_FIELDS =
  "name role department about skills achievements studentId batch semester interests projects " +
  "alumniId graduationYear currentCompany currentPosition industry experience createdAt";

// Discover / search members
router.get("/", requireAuth, async (req, res) => {
  const { q, role, department, batch, skill } = req.query;
  const filter = { _id: { $ne: req.user._id } };
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (batch) filter.batch = batch;
  if (skill) filter.skills = skill;
  if (q) filter.$text = { $search: q };
  const users = await User.find(filter).select(PUBLIC_PROFILE_FIELDS).limit(100).lean();
  res.json({ users });
});

router.get("/:id", requireAuth, async (req, res) => {
  const isSelf = String(req.params.id) === String(req.user._id);
  const fields = isSelf ? PUBLIC_PROFILE_FIELDS + " email" : PUBLIC_PROFILE_FIELDS;
  const user = await User.findById(req.params.id).select(fields);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// Edit own profile
router.put("/me", requireAuth, async (req, res) => {
  const allowed = [
    "name", "department", "about", "skills", "achievements",
    "studentId", "batch", "semester", "interests", "projects",
    "alumniId", "graduationYear", "currentCompany", "currentPosition", "industry", "experience",
  ];
  const updates = {};
  for (const key of allowed) if (key in req.body) updates[key] = req.body[key];
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-passwordHash");
  res.json({ user });
});

export default router;
