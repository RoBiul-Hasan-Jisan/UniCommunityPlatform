const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { createNotification } = require("./notify");

// Shared by the Socket.IO handler (text messages) and the REST attachment
// endpoint (image/document/voice). Mirrors BG-01 onMessageCreated: updates
// the parent conversation's preview/unread counts and notifies participants.
async function createMessage(io, { conversationId, senderId, text, type = "text", fileName, fileUrl }) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new Error("Conversation not found.");

  const message = await Message.create({
    conversationId,
    senderId,
    text: text || "",
    type,
    fileName: fileName || null,
    fileUrl: fileUrl || null,
    sentAt: new Date(),
  });

  let previewText = text || "";
  if (type === "image") previewText = "📷 Photo";
  if (type === "document") previewText = `📄 ${fileName || "Document"}`;
  if (type === "voice") previewText = "🎤 Voice message";

  for (const uid of convo.participantIds) {
    if (String(uid) !== String(senderId)) {
      const current = convo.unreadCount.get(String(uid)) || 0;
      convo.unreadCount.set(String(uid), current + 1);
    }
  }
  convo.lastMessage = previewText;
  convo.lastMessageAt = message.sentAt;
  convo.lastMessageSenderId = senderId;
  await convo.save();

  const sender = await User.findById(senderId);
  for (const uid of convo.participantIds) {
    if (String(uid) === String(senderId)) continue;
    await createNotification(io, uid, {
      type: "new_message",
      title: sender?.fullName || "Someone",
      body: previewText,
      route: `/chat/${conversationId}`,
      entityId: String(conversationId),
    });
    if (io) io.to(`user:${uid}`).emit("message:new", message);
  }
  if (io) io.to(`user:${senderId}`).emit("message:new", message);

  return message;
}

module.exports = { createMessage };
