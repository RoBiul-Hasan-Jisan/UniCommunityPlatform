import express from "express";
import Post, { Comment } from "../models/Post.js";
import { requireAuth } from "../middleware/auth.js";
import { writeLimiter, commentLimiter } from "../middleware/rateLimiters.js";
import { notify } from "../utils/notify.js";
import { logActivity } from "../utils/activityLogger.js";
import { getIO } from "../socket.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const { category, author } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const filter = { isDeletedByAdmin: false };
  if (category) filter.category = category;
  if (author) filter.author = author;
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name role department currentPosition currentCompany avatarUrl")
      .lean(),
    Post.countDocuments(filter),
  ]);
  res.json({ posts, page, hasMore: page * limit < total, total });
});

router.post("/", requireAuth, writeLimiter, async (req, res) => {
  const { content, category } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Post content is required" });
  const post = await Post.create({ author: req.user._id, content, category });
  await logActivity(req.user._id, "created a post", "Post", post._id);
  const populated = await Post.findById(post._id)
    .populate("author", "name role department currentPosition currentCompany avatarUrl")
    .lean();
  // Broadcast to everyone with the feed open so it appears live, Facebook-style.
  getIO()?.to("feed").emit("post:new", populated);
  res.status(201).json({ post: populated });
});

router.put("/:id", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const isOwner = String(post.author) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  if (req.body.content !== undefined) post.content = req.body.content;
  if (req.body.category !== undefined) post.category = req.body.category;
  await post.save();
  getIO()?.to("feed").emit("post:updated", { postId: post._id, content: post.content, category: post.category });
  res.json({ post });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const isOwner = String(post.author) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  if (req.user.role === "admin" && !isOwner) {
    post.isDeletedByAdmin = true;
    await post.save();
  } else {
    await Post.findByIdAndDelete(post._id);
    await Comment.deleteMany({ _id: { $in: [] } }); // placeholder for cascading cleanup
  }
  getIO()?.to("feed").emit("post:deleted", { postId: post._id });
  res.json({ success: true });
});

router.post("/:id/react", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const type = req.body.type || "like";
  const existingIdx = post.reactions.findIndex((r) => String(r.user) === String(req.user._id));
  if (existingIdx >= 0) {
    if (post.reactions[existingIdx].type === type) {
      post.reactions.splice(existingIdx, 1); // toggle off
    } else {
      post.reactions[existingIdx].type = type;
    }
  } else {
    post.reactions.push({ user: req.user._id, type });
    if (String(post.author) !== String(req.user._id)) {
      await notify(post.author, "reaction", `${req.user.name} reacted to your post`, `/post/${post._id}`);
    }
  }
  await post.save();
  getIO()?.to("feed").emit("post:reaction", { postId: post._id, reactions: post.reactions });
  res.json({ reactions: post.reactions });
});

router.post("/:id/save", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const idx = post.savedBy.findIndex((u) => String(u) === String(req.user._id));
  if (idx >= 0) post.savedBy.splice(idx, 1);
  else post.savedBy.push(req.user._id);
  await post.save();
  res.json({ saved: idx < 0 });
});

// Comments
router.get("/:id/comments", requireAuth, async (req, res) => {
  const comments = await Comment.find({ post: req.params.id })
    .sort({ createdAt: 1 })
    .populate("author", "name role avatarUrl")
    .lean();
  res.json({ comments });
});

router.post("/:id/comments", requireAuth, commentLimiter, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const { text, parentComment } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Comment text is required" });
  const comment = await Comment.create({ post: post._id, author: req.user._id, text, parentComment: parentComment || null });
  const populated = await Comment.findById(comment._id).populate("author", "name role avatarUrl").lean();
  if (String(post.author) !== String(req.user._id)) {
    await notify(post.author, "post_comment", `${req.user.name} commented on your post`, `/post/${post._id}`);
  }
  // Live-append the comment for anyone who has this post's comment panel open.
  getIO()?.to("feed").emit("post:comment", { postId: post._id, comment: populated });
  res.status(201).json({ comment: populated });
});

export default router;
