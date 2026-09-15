import mongoose from "mongoose";
const { Schema } = mongoose;

const registrationSchema = new Schema(
  {
    workshop: { type: Schema.Types.ObjectId, ref: "Workshop", required: true },
    participant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["registered", "cancelled", "attended"], default: "registered" },
  },
  { timestamps: true }
);
registrationSchema.index({ workshop: 1, participant: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);
