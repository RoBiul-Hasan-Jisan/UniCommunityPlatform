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
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", location: "text", description: "text" });

export default mongoose.model("Job", jobSchema);
