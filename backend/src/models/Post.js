import mongoose from "mongoose";
const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    parentComment: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  },
  { timestamps: true }
);

const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "Discussion", "Question", "Achievement", "Career", "Research",
        "Internship", "Job Opportunity", "Project", "Announcement", "General",
      ],
      default: "Discussion",
    },
    reactions: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        type: { type: String, enum: ["like", "celebrate", "support"], default: "like" },
      },
    ],
    savedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    images: [{ type: String }],
    hashtags: [{ type: String, lowercase: true }],
    isDeletedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });
postSchema.index({ isDeletedByAdmin: 1, createdAt: -1 });
postSchema.index({ isDeletedByAdmin: 1, category: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ savedBy: 1 });
postSchema.index({ content: "text" });

export const Comment = mongoose.model("Comment", commentSchema);
export default mongoose.model("Post", postSchema);
