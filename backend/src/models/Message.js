import mongoose from "mongoose";
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    attachmentUrl: { type: String, default: "" },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, sender: 1, readBy: 1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
export default mongoose.model("Message", messageSchema);
