const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    type: { type: String, enum: ["text", "image", "document", "voice"], default: "text" },
    fileName: { type: String, default: null },
    fileUrl: { type: String, default: null },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, sentAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
