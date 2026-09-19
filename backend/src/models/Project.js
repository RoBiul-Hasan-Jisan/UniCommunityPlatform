import mongoose from "mongoose";
const { Schema } = mongoose;

const projectSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    techStack: [{ type: String }],
    link: { type: String, default: "" }, // live demo / deployed link
    repoLink: { type: String, default: "" },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    stars: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeletedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

projectSchema.index({ title: "text", description: "text", techStack: "text" });

export default mongoose.model("Project", projectSchema);
