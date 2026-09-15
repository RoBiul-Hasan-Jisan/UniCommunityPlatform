import mongoose from "mongoose";
const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true }, // e.g. "registered", "created a workshop"
    targetType: { type: String, default: "" },
    targetId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);
