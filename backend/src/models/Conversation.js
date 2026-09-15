const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    conversationKey: { type: String, required: true, unique: true }, // deterministic "id1_id2"
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    participantDetails: {
      type: Map,
      of: new mongoose.Schema(
        { fullName: String, photoUrl: { type: String, default: null } },
        { _id: false }
      ),
      default: {},
    },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageSenderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    unreadCount: { type: Map, of: Number, default: {} },
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
