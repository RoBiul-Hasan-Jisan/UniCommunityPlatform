import mongoose from "mongoose";
const { Schema } = mongoose;

const jobSchema = new Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, default: "" },
    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship", "Contract", "Remote"],
      default: "Full-time",
    },
    category: {
      type: String,
      enum: ["Engineering", "Design", "Business", "Marketing", "Finance", "Research", "Operations", "Other"],
      default: "Other",
    },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    salaryRange: { type: String, default: "" },
    applyLink: { type: String, default: "" },
    applyEmail: { type: String, default: "" },
    deadline: { type: Date },
    postedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    savedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeletedByAdmin: { type: Boolean, default: false },

    // Referral board: the poster (often an alumnus at that company) can
    // offer to refer people internally, separate from just sharing the
    // listing. Requests are embedded rather than a separate collection —
    // there's never going to be many per job, same pattern as reactions.
    referralAvailable: { type: Boolean, default: false },
    referralNote: { type: String, default: "" },
    referralRequests: [
      {
        requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, default: "" },
        status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", location: "text", description: "text" });

export default mongoose.model("Job", jobSchema);
