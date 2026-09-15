const mongoose = require("mongoose");

const mentorshipRequestSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    alumniId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true },
    studentPhotoUrl: { type: String, default: null },
    alumniName: { type: String, required: true },
    alumniPhotoUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "completed"],
      default: "pending",
    },
    message: { type: String, required: true },
    declineReason: { type: String, default: null },
  },
  { timestamps: true }
);

mentorshipRequestSchema.index({ studentId: 1, alumniId: 1, status: 1 });

module.exports = mongoose.model("MentorshipRequest", mentorshipRequestSchema);
