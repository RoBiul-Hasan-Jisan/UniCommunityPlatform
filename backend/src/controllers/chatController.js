const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

function conversationKeyFor(idA, idB) {
  return [String(idA), String(idB)].sort().join("_");
}

// GET /api/chat/conversations — list current user's conversations, most recent first
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participantIds: req.user._id }).sort({ lastMessageAt: -1 });
  res.json({ success: true, conversations });
});

// POST /api/chat/conversations  { otherUserId }
// Mirrors CF-08 getOrCreateConversation.
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { otherUserId } = req.body;
  if (!otherUserId) throw new ApiError(400, "otherUserId is required.");
  if (String(otherUserId) === String(req.user._id)) {
    throw new ApiError(400, "Cannot create a conversation with yourself.");
  }

  const otherUser = await User.findById(otherUserId);
  if (!otherUser) throw new ApiError(404, "User not found.");

  const key = conversationKeyFor(req.user._id, otherUserId);
  let convo = await Conversation.findOne({ conversationKey: key });
  let created = false;

  if (!convo) {
    convo = await Conversation.create({
      conversationKey: key,
      participantIds: [req.user._id, otherUserId],
      participantDetails: {
        [String(req.user._id)]: { fullName: req.user.fullName, photoUrl: req.user.photoUrl },
        [String(otherUserId)]: { fullName: otherUser.fullName, photoUrl: otherUser.photoUrl },
      },
      unreadCount: { [String(req.user._id)]: 0, [String(otherUserId)]: 0 },
    });
    created = true;
  }

  res.status(created ? 201 : 200).json({ success: true, conversation: convo, created });
});

// GET /api/chat/conversations/:id/messages
const getMessages = asyncHandler(async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw new ApiError(404, "Conversation not found.");
  if (!convo.participantIds.some((id) => String(id) === String(req.user._id))) {
    throw new ApiError(403, "You are not part of this conversation.");
  }

  const messages = await Message.find({ conversationId: convo._id }).sort({ sentAt: 1 });

  // Mark as read for this user.
  convo.unreadCount.set(String(req.user._id), 0);
  await convo.save();

  res.json({ success: true, messages });
});

module.exports = { listConversations, getOrCreateConversation, getMessages };
