"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import PostCard from "../../components/PostCard";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getSocket } from "../../lib/socket";

const CATEGORIES = [
  "Discussion", "Question", "Achievement", "Career", "Research",
  "Internship", "Job Opportunity", "Project", "Announcement", "General",
];

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Discussion");
  const [filter, setFilter] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCount, setNewCount] = useState(0); // posts that arrived live while... nothing to hide behind, but kept for a subtle "Live" pulse

  async function load() {
    setLoading(true);
    try {
      const query = filter ? `?category=${encodeURIComponent(filter)}` : "";
      const { posts } = await api(`/posts${query}`);
      setPosts(posts);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, authLoading, user]);

  // Real-time feed: every logged-in tab sits in the shared "feed" room, so
  // new posts, reactions, comments, and deletions from ANYONE appear here
  // instantly, no refresh needed.
  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();

    function onNewPost(post) {
      if (filter && post.category !== filter) return;
      setPosts((ps) => (ps.some((p) => p._id === post._id) ? ps : [post, ...ps]));
      setNewCount((n) => n + 1);
      setTimeout(() => setNewCount((n) => Math.max(0, n - 1)), 1500);
    }
    function onUpdated({ postId, content, category }) {
      setPosts((ps) => ps.map((p) => (p._id === postId ? { ...p, content, category } : p)));
    }
    function onDeleted({ postId }) {
      setPosts((ps) => ps.filter((p) => p._id !== postId));
    }
    function onReaction({ postId, reactions }) {
      setPosts((ps) => ps.map((p) => (p._id === postId ? { ...p, reactions } : p)));
    }

    socket.on("post:new", onNewPost);
    socket.on("post:updated", onUpdated);
    socket.on("post:deleted", onDeleted);
    socket.on("post:reaction", onReaction);
    return () => {
      socket.off("post:new", onNewPost);
      socket.off("post:updated", onUpdated);
      socket.off("post:deleted", onDeleted);
      socket.off("post:reaction", onReaction);
    };
  }, [authLoading, user, filter]);

  function updateReactions(postId, reactions) {
    setPosts((ps) => ps.map((p) => (p._id === postId ? { ...p, reactions } : p)));
  }
  function removePost(postId) {
    setPosts((ps) => ps.filter((p) => p._id !== postId));
  }

  async function submitPost(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const { post } = await api("/posts", { method: "POST", body: { content, category } });
      setContent("");
      // Show it immediately for the poster — the live "post:new" broadcast
      // will also arrive a moment later but is deduped by _id above.
      if (!filter || post.category === filter) {
        setPosts((ps) => (ps.some((p) => p._id === post._id) ? ps : [post, ...ps]));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">Community feed</h1>
          <p className="text-sm text-gray-500 mt-1">What's happening across your university community.</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`w-1.5 h-1.5 rounded-full ${newCount > 0 ? "bg-brass-500 animate-pulse" : "bg-gray-300"}`} />
          Live
        </span>
      </div>

      {user?.role === "alumni" && (
        <div className="card p-4 mb-6 flex items-center justify-between gap-3 bg-ink-800 text-paper border-none">
          <div className="text-sm">Got something to teach? Host a workshop for current students.</div>
          <Link href="/workshops/create" className="btn-primary text-xs shrink-0">+ Create Workshop</Link>
        </div>
      )}
      {user?.role === "student" && (
        <div className="card p-4 mb-6 flex items-center justify-between gap-3 border-brass-300">
          <div className="text-sm text-ink-700">Looking for direction? Ask an alumnus for mentorship.</div>
          <Link href="/mentorship" className="btn-secondary text-xs shrink-0">Find a mentor</Link>
        </div>
      )}

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      <form onSubmit={submitPost} className="card-feature p-5 mb-8">
        <div className="text-sm font-medium text-ink-700 mb-2">Share something</div>
        <textarea
          className="input"
          rows={3}
          placeholder="What's happening in your university community?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center justify-between mt-3">
          <select className="input w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className="btn-primary" disabled={posting} type="submit">
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button className={`badge border ${filter === "" ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setFilter("")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`badge border whitespace-nowrap ${filter === c ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading posts…</div>}
      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard key={p._id} post={p} onReact={updateReactions} onDeleted={removePost} />
        ))}
        {!loading && posts.length === 0 && (
          <div className="card p-8 text-center text-gray-400 text-sm">Nothing posted yet — be the first to share something.</div>
        )}
      </div>
    </AppShell>
  );
}
