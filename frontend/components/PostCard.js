"use client";

import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

const CATEGORY_COLORS = {
  Discussion: "bg-gray-100 text-gray-700",
  Question: "bg-yellow-100 text-yellow-700",
  Achievement: "bg-green-100 text-green-700",
  Career: "bg-blue-100 text-blue-700",
  Research: "bg-indigo-100 text-indigo-700",
  Internship: "bg-teal-100 text-teal-700",
  "Job Opportunity": "bg-purple-100 text-purple-700",
  Project: "bg-pink-100 text-pink-700",
  Announcement: "bg-amber-100 text-amber-700",
  General: "bg-gray-100 text-gray-700",
};

export default function PostCard({ post, onChanged }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const myReaction = post.reactions?.find((r) => r.user === user?._id || r.user?._id === user?._id);
  const isOwner = post.author?._id === user?._id;
  const canManage = isOwner || user?.role === "admin";

  async function react() {
    await api(`/posts/${post._id}/react`, { method: "POST", body: { type: "like" } });
    onChanged?.();
  }

  async function toggleComments() {
    setShowComments((s) => !s);
    if (!showComments) {
      setLoadingComments(true);
      try {
        const d = await api(`/posts/${post._id}/comments`);
        setComments(d.comments);
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    const { comment } = await api(`/posts/${post._id}/comments`, { method: "POST", body: { text: commentText } });
    setComments((c) => [...c, { ...comment, author: { name: user.name, role: user.role } }]);
    setCommentText("");
  }

  async function remove() {
    if (!confirm("Delete this post?")) return;
    await api(`/posts/${post._id}`, { method: "DELETE" });
    onChanged?.();
  }

  async function report() {
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason) return;
    await api("/reports", { method: "POST", body: { targetType: "post", targetId: post._id, reason } });
    alert("Thanks — this post has been reported to admins.");
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{post.author?.name}</div>
          <div className="text-xs text-gray-500 capitalize">
            {post.author?.role}
            {post.author?.currentPosition ? ` · ${post.author.currentPosition} at ${post.author.currentCompany}` : ""}
            {post.author?.department ? ` · ${post.author.department}` : ""}
          </div>
        </div>
        <span className={`badge ${CATEGORY_COLORS[post.category] || "bg-gray-100 text-gray-700"}`}>{post.category}</span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{post.content}</p>

      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <button onClick={react} className={myReaction ? "text-brand-600 font-medium" : ""}>
          👍 {post.reactions?.length || 0}
        </button>
        <button onClick={toggleComments}>💬 Comments</button>
        {!canManage && <button onClick={report}>🚩 Report</button>}
        {canManage && <button onClick={remove} className="text-red-600">🗑 Delete</button>}
      </div>

      {showComments && (
        <div className="mt-3 border-t pt-3 space-y-2">
          {loadingComments && <div className="text-xs text-gray-400">Loading comments...</div>}
          {comments.map((c) => (
            <div key={c._id} className="text-sm">
              <span className="font-medium">{c.author?.name}: </span>
              <span className="text-gray-700">{c.text}</span>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 mt-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button className="btn-secondary text-sm" type="submit">Post</button>
          </form>
        </div>
      )}
    </div>
  );
}
