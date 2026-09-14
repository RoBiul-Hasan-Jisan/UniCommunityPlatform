"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import PostCard from "../../components/PostCard";
import { api } from "../../lib/api";

const CATEGORIES = [
  "Discussion", "Question", "Achievement", "Career", "Research",
  "Internship", "Job Opportunity", "Project", "Announcement", "General",
];

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Discussion");
  const [filter, setFilter] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const query = filter ? `?category=${encodeURIComponent(filter)}` : "";
      const { posts } = await api(`/posts${query}`);
      setPosts(posts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function submitPost(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api("/posts", { method: "POST", body: { content, category } });
      setContent("");
      await load();
    } finally {
      setPosting(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Community Feed</h1>

      <form onSubmit={submitPost} className="card p-4 mb-6">
        <div className="text-sm font-medium text-gray-500 mb-2">Create a post</div>
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
            {posting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button className={`badge ${filter === "" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"}`} onClick={() => setFilter("")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`badge whitespace-nowrap ${filter === c ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading posts...</div>}
      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard key={p._id} post={p} onChanged={load} />
        ))}
        {!loading && posts.length === 0 && (
          <div className="card p-6 text-center text-gray-400 text-sm">No posts yet — be the first to share something!</div>
        )}
      </div>
    </AppShell>
  );
}
