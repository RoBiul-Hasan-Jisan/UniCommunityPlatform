import express from "express";
import User from "../models/User.js";
import Workshop from "../models/Workshop.js";
import Mentorship from "../models/Mentorship.js";
import Post from "../models/Post.js";
import Connection from "../models/Connection.js";
import Job from "../models/Job.js";
import { requireAuth } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

// Fields any authenticated community member is allowed to see about another
// user. Internal/auth-linkage fields (firebaseUid, isDemo, status, passwordHash,
// email) are deliberately excluded — they are never sent to the browser for
// anyone but the account owner (see /me and /users/me).
const PUBLIC_PROFILE_FIELDS =
  "name role department about skills achievements studentId batch semester interests projects " +
  "alumniId graduationYear currentCompany currentPosition industry experience endorsements createdAt";

// Discover / search members. Admin accounts are staff, not community
// members to network with — they're managed separately under /admin/users
// and never appear here, regardless of filters.
router.get("/", requireAuth, async (req, res) => {
  const { q, role, department, batch, skill } = req.query;
  const filter = { _id: { $ne: req.user._id }, role: { $ne: "admin" } };
  if (role && role !== "admin") filter.role = role;
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
  const user = await User.findById(req.params.id).select(fields).populate("endorsements.endorsedBy", "name role");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// Endorse (or un-endorse, toggling) one of this person's listed skills.
// Anyone can endorse anyone else's skill — no self-endorsing, and only
// skills the person has actually listed on their profile are endorsable.
router.post("/:id/endorse", requireAuth, async (req, res) => {
  const { skill } = req.body;
  if (!skill) return res.status(400).json({ error: "Missing skill" });
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ error: "You can't endorse your own skill" });

  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (!target.skills.includes(skill)) return res.status(400).json({ error: "That skill isn't on this person's profile" });

  const existingIdx = target.endorsements.findIndex((e) => e.skill === skill && String(e.endorsedBy) === String(req.user._id));
  if (existingIdx >= 0) {
    target.endorsements.splice(existingIdx, 1); // toggle off
  } else {
    target.endorsements.push({ skill, endorsedBy: req.user._id });
    if (target.endorsements.filter((e) => e.skill === skill).length === 1) {
      await notify(target._id, "endorsement", `${req.user.name} endorsed you for ${skill}`, `/profile/${target._id}`);
    }
  }
  await target.save();
  const updated = await User.findById(target._id).select("endorsements").populate("endorsements.endorsedBy", "name role");
  res.json({ endorsements: updated.endorsements });
});

// A lightweight "how much has this person given back" summary, computed
// from data already being tracked elsewhere (no separate scoring system to
// keep in sync) — workshops hosted, mentorship answered, referrals given,
// and jobs shared. Purely informational, never affects permissions.
router.get("/:id/impact", requireAuth, async (req, res) => {
  const userId = req.params.id;
  const [workshopsHosted, mentorshipAnswered, jobsShared, referralsGiven, postsCount, connectionsCount] = await Promise.all([
    Workshop.countDocuments({ host: userId }),
    Mentorship.countDocuments({ alumni: userId, "responses.0": { $exists: true } }),
    Job.countDocuments({ postedBy: userId }),
    Job.countDocuments({ postedBy: userId, "referralRequests.status": "accepted" }),
    Post.countDocuments({ author: userId, isDeletedByAdmin: false }),
    Connection.countDocuments({ status: "accepted", $or: [{ requester: userId }, { recipient: userId }] }),
  ]);

  const score = workshopsHosted * 5 + mentorshipAnswered * 3 + referralsGiven * 4 + jobsShared * 2 + postsCount * 1;
  let tier = "Getting started";
  if (score >= 60) tier = "Community pillar";
  else if (score >= 30) tier = "Active contributor";
  else if (score >= 10) tier = "Rising contributor";

  res.json({
    workshopsHosted, mentorshipAnswered, jobsShared, referralsGiven, postsCount, connectionsCount,
    score, tier,
  });
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
