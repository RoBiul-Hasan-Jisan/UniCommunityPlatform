import mongoose from "mongoose";
const { Schema } = mongoose;

const mentorshipSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    alumni: { type: Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected", "closed"], default: "pending" },
    responses: [
      {
        author: { type: Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

mentorshipSchema.index({ student: 1, createdAt: -1 });
mentorshipSchema.index({ alumni: 1, status: 1 });

export default mongoose.model("Mentorship", mentorshipSchema);
