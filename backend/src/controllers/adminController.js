const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { createNotification } = require("../utils/notify");

// GET /api/admin/pending-alumni — alumni awaiting verification
const listPendingAlumni = asyncHandler(async (req, res) => {
  const pending = await User.find({ role: "alumni", verificationStatus: "pending" }).sort({ createdAt: 1 });
  res.json({ success: true, pending: pending.map((u) => u.toPublicJSON()) });
});

// PATCH /api/admin/alumni/:id/approve — mirrors CF-01 approveAlumni.
const approveAlumni = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");
  if (user.role !== "alumni") throw new ApiError(400, "User is not an alumni account.");

  user.verificationStatus = "verified";
  await user.save();

  await createNotification(req.io, user._id, {
    type: "system",
    title: "Account Verified! 🎉",
    body: "Your alumni account has been verified. Welcome to the network!",
    route: "/home",
  });

  res.json({ success: true, user: user.toPublicJSON() });
});

// PATCH /api/admin/alumni/:id/reject  { reason }  — mirrors CF-02 rejectAlumni.
const rejectAlumni = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, "reason is required.");

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");

  user.verificationStatus = "rejected";
  await user.save();

  await createNotification(req.io, user._id, {
    type: "system",
    title: "Verification Update",
    body: `Your alumni verification was declined: ${reason}`,
    route: "/home",
  });

  res.json({ success: true, user: user.toPublicJSON() });
});

// GET /api/admin/stats — quick counts for the admin dashboard
const getStats = asyncHandler(async (req, res) => {
  const [students, alumni, pendingAlumni, admins] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "alumni", verificationStatus: "verified" }),
    User.countDocuments({ role: "alumni", verificationStatus: "pending" }),
    User.countDocuments({ role: "admin" }),
  ]);
  res.json({ success: true, stats: { students, alumni, pendingAlumni, admins } });
});

module.exports = { listPendingAlumni, approveAlumni, rejectAlumni, getStats };
