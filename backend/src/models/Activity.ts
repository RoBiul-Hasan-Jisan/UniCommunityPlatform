import mongoose from "mongoose";
const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true }, // e.g. "registered", "created a workshop"
    targetType: { type: String, default: "" },
    targetId: { type: Schema.Types.ObjectId },
    // Audit trail extras (who did it from where, plus any context worth keeping).
    ip: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
