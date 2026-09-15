const MentorshipRequest = require("../models/MentorshipRequest");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { createNotification } = require("../utils/notify");

function conversationKeyFor(idA, idB) {
  return [String(idA), String(idB)].sort().join("_");
}

// POST /api/mentorship  (student only)
// Mirrors CF-03 sendMentorshipRequest.
const sendRequest = asyncHandler(async (req, res) => {
  const { alumniId, message } = req.body;
  if (!alumniId) throw new ApiError(400, "alumniId is required.");
  if (!message || message.length < 10) {
    throw new ApiError(400, "message is required and must be at least 10 characters.");
  }

  const alumni = await User.findOne({ _id: alumniId, role: "alumni", verificationStatus: "verified" });
  if (!alumni) throw new ApiError(404, "Alumni not found in directory.");
  if (!alumni.openToMentorship) {
    throw new ApiError(400, "This alumni is not currently accepting mentorship requests.");
  }

  const existing = await MentorshipRequest.findOne({
    studentId: req.user._id,
    alumniId,
    status: { $in: ["pending", "accepted"] },
  });
  if (existing) {
    throw new ApiError(409, "You already have a pending or active mentorship with this alumni.");
  }

  const request = await MentorshipRequest.create({
    studentId: req.user._id,
    alumniId,
    studentName: req.user.fullName,
    studentPhotoUrl: req.user.photoUrl,
    alumniName: alumni.fullName,
    alumniPhotoUrl: alumni.photoUrl,
    message,
  });

  await createNotification(req.io, alumni._id, {
    type: "mentorship_request",
    title: "New Mentorship Request",
    body: `${req.user.fullName} has requested your mentorship.`,
    route: `/mentorship/${request._id}`,
    entityId: String(request._id),
  });

  res.status(201).json({ success: true, request });
});

// PATCH /api/mentorship/:id/respond  (alumni only) { action: "accept" | "decline", reason? }
// Mirrors CF-04 respondToMentorshipRequest.
const respondToRequest = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  if (!["accept", "decline"].includes(action)) {
    throw new ApiError(400, "action must be 'accept' or 'decline'.");
  }
  if (action === "decline" && !reason) {
    throw new ApiError(400, "reason is required when declining.");
  }

  const request = await MentorshipRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, "Mentorship request not found.");
  if (String(request.alumniId) !== String(req.user._id)) {
    throw new ApiError(403, "You are not the alumni on this request.");
  }

  const targetStatus = action === "accept" ? "accepted" : "declined";
  if (request.status === targetStatus) {
    return res.json({ success: true, request });
  }
  if (request.status !== "pending") {
    throw new ApiError(400, `Request is already '${request.status}'. Cannot ${action}.`);
  }

  request.status = targetStatus;
  if (action === "decline") request.declineReason = reason;
  await request.save();

  if (action === "accept") {
    const key = conversationKeyFor(request.studentId, req.user._id);
    let convo = await Conversation.findOne({ conversationKey: key });
    if (!convo) {
      convo = await Conversation.create({
        conversationKey: key,
        participantIds: [request.studentId, req.user._id],
        participantDetails: {
          [String(request.studentId)]: { fullName: request.studentName, photoUrl: request.studentPhotoUrl },
          [String(req.user._id)]: { fullName: req.user.fullName, photoUrl: req.user.photoUrl },
        },
        lastMessage: "Mentorship accepted! Start chatting.",
        lastMessageAt: new Date(),
        lastMessageSenderId: req.user._id,
        unreadCount: { [String(request.studentId)]: 1, [String(req.user._id)]: 0 },
      });
    }
  }

  const notifTitle = action === "accept" ? "Mentorship Accepted! 🎉" : "Mentorship Update";
  const notifBody =
    action === "accept"
      ? `${request.alumniName} has accepted your mentorship request!`
      : `${request.alumniName} has declined your request: ${reason}`;

  await createNotification(req.io, request.studentId, {
    type: action === "accept" ? "mentorship_accepted" : "mentorship_declined",
    title: notifTitle,
    body: notifBody,
    route: `/mentorship/${request._id}`,
    entityId: String(request._id),
  });

  res.json({ success: true, request });
});

// GET /api/mentorship  — list requests relevant to the current user (as student or alumni)
const listMyRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {
    $or: [{ studentId: req.user._id }, { alumniId: req.user._id }],
  };
  if (status) filter.status = status;

  const requests = await MentorshipRequest.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, requests });
});

module.exports = { sendRequest, respondToRequest, listMyRequests };
