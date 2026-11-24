"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { getSocket } from "../lib/socket";
import Link from "next/link";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";

// Outlined, single-accent-family tags rather than a rainbow of solid fills —
// category is metadata, not a badge to shout with.
const CATEGORY_STYLE = {
  Discussion: "border-gray-300 text-gray-600",
  Question: "border-brass-300 text-brass-600",
  Achievement: "border-brass-300 text-brass-600",
  Career: "border-ink-300 text-ink-500",
  Research: "border-ink-300 text-ink-500",
  Internship: "border-ink-300 text-ink-500",
  "Job Opportunity": "border-ink-300 text-ink-500",
  Project: "border-gray-300 text-gray-600",
  Announcement: "border-crimson-400 text-crimson-500",
  General: "border-gray-300 text-gray-600",
};


// Turns "#hashtags" in a post into links that filter the feed.
function renderContent(text, onTag) {
  const parts = String(text).split(/((?:^|\s)#[\p{L}\p{N}_]{2,40})/gu);
  return parts.map((part, i) => {
    const m = part.match(/^(\s?)#([\p{L}\p{N}_]{2,40})$/u);
    if (!m) return part;
    const tag = m[2].toLowerCase();
    return (
      <span key={i}>
        {m[1]}
        {onTag ? (
          <button type="button" onClick={() => onTag(tag)} className="text-brass-600 hover:underline">#{m[2]}</button>
        ) : (
          <Link href={`/feed?tag=${tag}`} className="text-brass-600 hover:underline">#{m[2]}</Link>
        )}
      </span>
    );
  });
}

// post: the live post object from the feed's state (its .reactions update in
// real time via the parent's socket listener).
// onReact/onDeleted: let this card push its own optimistic change straight
// into the parent's state so the actor sees it instantly, without waiting on
// the round-trip through the server's broadcast.
export default function PostCard({ post, onReact, onDeleted, onTag, onSaveChange }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [live, setLive] = useState(false);
  const commentsLoadedFor = useRef(null);

  const myReaction = post.reactions?.find((r) => r.user === user?._id || r.user?._id === user?._id);
  const [saved, setSaved] = useState(!!post.savedBy?.some((u) => String(u?._id || u) === String(user?._id)));
  const isOwner = post.author?._id === user?._id;
  const canManage = isOwner || user?.role === "admin";

  // Live comments: if this card's thread is open, new comments from anyone
  // (including other tabs/users) appear immediately, Facebook-style.
  useEffect(() => {
    const socket = getSocket();
    function onComment({ postId, comment }) {
      if (String(postId) !== String(post._id)) return;
      setComments((c) => (c.some((x) => x._id === comment._id) ? c : [...c, comment]));
      setLive(true);
      setTimeout(() => setLive(false), 1200);
    }
    socket.on("post:comment", onComment);
    return () => socket.off("post:comment", onComment);
  }, [post._id]);

  async function react() {
    try {
      const { reactions } = await api(`/posts/${post._id}/react`, { method: "POST", body: { type: "like" } });
      onReact?.(post._id, reactions);
    } catch (_) {
      // the socket broadcast will still reconcile state for everyone else even if this call failed
    }
  }

  async function toggleComments() {
    const opening = !showComments;
    setShowComments(opening);
    if (opening && commentsLoadedFor.current !== post._id) {
      setLoadingComments(true);
      try {
        const d = await api(`/posts/${post._id}/comments`);
        setComments(d.comments);
        commentsLoadedFor.current = post._id;
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    const { comment } = await api(`/posts/${post._id}/comments`, { method: "POST", body: { text: commentText } });
    setComments((c) => (c.some((x) => x._id === comment._id) ? c : [...c, comment]));
    setCommentText("");
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next); // optimistic
    try {
      const res = await api(`/posts/${post._id}/save`, { method: "POST" });
      setSaved(res.saved);
      onSaveChange?.(post._id, res.saved);
    } catch (_) {
      setSaved(!next);
    }
  }

  async function remove() {
    if (!confirm("Delete this post?")) return;
    await api(`/posts/${post._id}`, { method: "DELETE" });
    onDeleted?.(post._id);
  }

  async function report() {
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason) return;
    await api("/reports", { method: "POST", body: { targetType: "post", targetId: post._id, reason } });
    alert("Thanks — this post has been reported to admins.");
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={post.author?.name} avatarUrl={post.author?.avatarUrl} className="w-9 h-9 text-xs mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold text-ink-800 truncate">{post.author?.name} <VerifiedBadge show={post.author?.verified} /></div>
            <div className="text-xs text-gray-500 capitalize">
              {post.author?.role}
              {post.author?.currentPosition ? ` · ${post.author.currentPosition} at ${post.author.currentCompany}` : ""}
              {post.author?.department ? ` · ${post.author.department}` : ""}
            </div>
          </div>
        </div>
        <span className={`badge border bg-transparent shrink-0 ${CATEGORY_STYLE[post.category] || "border-gray-300 text-gray-600"}`}>
          {post.category}
        </span>
      </div>

      <p className="mt-3.5 whitespace-pre-wrap text-[0.925rem] leading-relaxed text-ink-700">{renderContent(post.content, onTag)}</p>

      {post.images?.length > 0 && (
        <div className={`mt-3 grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.images.map((src) => (
            <a key={src} href={src} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Attached to post" loading="lazy" className="w-full max-h-96 object-cover rounded-md border border-gray-200" />
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-5 text-sm text-gray-500">
        <button onClick={react} className={`flex items-center gap-1.5 transition-colors ${myReaction ? "text-brass-600 font-semibold" : "hover:text-ink-700"}`}>
          <span>👍</span> {post.reactions?.length || 0}
        </button>
        <button onClick={toggleComments} className="hover:text-ink-700 transition-colors">Comments</button>
        <button onClick={toggleSave} aria-pressed={saved} className={`transition-colors ${saved ? "text-brass-600 font-semibold" : "hover:text-ink-700"}`}>
          {saved ? "★ Saved" : "☆ Save"}
        </button>
        {!canManage && <button onClick={report} className="hover:text-crimson-500 transition-colors ml-auto">Report</button>}
        {canManage && <button onClick={remove} className="text-crimson-500 hover:text-crimson-600 ml-auto">Delete</button>}
      </div>

      {showComments && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2.5">
          {loadingComments && <div className="text-xs text-gray-400">Loading comments…</div>}
          {comments.map((c) => (
            <div key={c._id} className="text-sm flex gap-2">
              <Avatar name={c.author?.name} avatarUrl={c.author?.avatarUrl} className="w-6 h-6 text-[10px] mt-0.5" />
              <span><span className="font-medium text-ink-700">{c.author?.name}: </span><span className="text-gray-600">{c.text}</span></span>
            </div>
          ))}
          {live && <div className="text-[11px] text-brass-600">New comment just now</div>}
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
