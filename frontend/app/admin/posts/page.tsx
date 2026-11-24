"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminPostsPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { posts } = await api("/admin/posts");
      setPosts(posts);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function remove(id) {
    if (!confirm("Delete this post?")) return;
    try {
      await api(`/admin/posts/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">All Posts</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {posts.map((p) => (
          <div key={p._id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500">{p.author?.name} · {p.category} {p.isDeletedByAdmin && <span className="text-crimson-400">(hidden)</span>}</div>
              <div className="text-sm mt-1">{p.content}</div>
            </div>
            <button className="text-crimson-500 text-sm whitespace-nowrap" onClick={() => remove(p._id)}>Delete</button>
          </div>
        ))}
        {posts.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No posts yet.</div>}
      </div>
    </AppShell>
  );
}
