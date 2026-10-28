import mongoose from "mongoose";
const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["post", "comment", "user", "job", "event", "project", "workshop"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
    // Moderation outcome: what the admin actually did about it.
    actionTaken: { type: String, enum: ["none", "warned", "content_hidden", "user_disabled"], default: "none" },
    resolutionNote: { type: String, default: "" },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model("Report", reportSchema);
