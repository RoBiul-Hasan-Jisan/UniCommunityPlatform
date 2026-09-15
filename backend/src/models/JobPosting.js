const mongoose = require("mongoose");

const VALID_JOB_TYPES = ["full-time", "part-time", "internship", "remote", "contract"];

const jobPostingSchema = new mongoose.Schema(
  {
    postedByAlumniId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    posterName: { type: String, required: true },
    posterPhotoUrl: { type: String, default: null },
    title: { type: String, required: true, maxlength: 200 },
    company: { type: String, required: true },
    location: { type: String, required: true },
    jobType: { type: String, enum: VALID_JOB_TYPES, required: true },
    description: { type: String, required: true },
    applyLink: { type: String, required: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    postedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

jobPostingSchema.statics.VALID_JOB_TYPES = VALID_JOB_TYPES;

module.exports = mongoose.model("JobPosting", jobPostingSchema);
