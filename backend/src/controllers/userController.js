const User = require("../models/User");
const Conversation = require("../models/Conversation");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const EDITABLE_FIELDS = [
  "fullName", "photoUrl", "coverPhotoUrl", "department", "batchYear",
  "currentCompany", "jobTitle", "bio", "location", "skills",
  "openToMentorship", "linkedinUrl",
];

// GET /api/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found.");
  res.json({ success: true, user: user.toPublicJSON() });
});

// PATCH /api/users/me
// Mirrors BG-02 onUserProfileUpdated: when fullName/photoUrl change, propagate
// the new values into every conversation this user participates in.
const updateMe = asyncHandler(async (req, res) => {
  const before = { fullName: req.user.fullName, photoUrl: req.user.photoUrl };

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  }
  await req.user.save();

  const nameChanged = before.fullName !== req.user.fullName;
  const photoChanged = before.photoUrl !== req.user.photoUrl;

  if (nameChanged || photoChanged) {
    const conversations = await Conversation.find({ participantIds: req.user._id });
    for (const convo of conversations) {
      const detail = convo.participantDetails.get(String(req.user._id)) || {};
      if (nameChanged) detail.fullName = req.user.fullName;
      if (photoChanged) detail.photoUrl = req.user.photoUrl;
      convo.participantDetails.set(String(req.user._id), detail);
      await convo.save();
    }
  }

  res.json({ success: true, user: req.user.toPublicJSON() });
});

// POST /api/users/me/photo  (multipart field: "photo")
const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded.");
  req.user.photoUrl = `/uploads/${req.file.filename}`;
  await req.user.save();
  res.json({ success: true, photoUrl: req.user.photoUrl });
});

// POST /api/users/me/certificate  (multipart field: "certificate")
// Alumni upload proof of graduation for admin verification.
const uploadCertificate = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded.");
  req.user.certificateUrl = `/uploads/${req.file.filename}`;
  await req.user.save();
  res.json({ success: true, certificateUrl: req.user.certificateUrl });
});

module.exports = { getUserById, updateMe, uploadPhoto, uploadCertificate };
