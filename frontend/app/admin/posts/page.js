"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState([]);

  async function load() {
    const { posts } = await api("/admin/posts");
    setPosts(posts);
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm("Delete this post?")) return;
    await api(`/admin/posts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">All Posts</h1>
      <div className="card divide-y">
        {posts.map((p) => (
          <div key={p._id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500">{p.author?.name} · {p.category} {p.isDeletedByAdmin && <span className="text-red-500">(hidden)</span>}</div>
              <div className="text-sm mt-1">{p.content}</div>
            </div>
            <button className="text-red-600 text-sm whitespace-nowrap" onClick={() => remove(p._id)}>Delete</button>
          </div>
        ))}
        {posts.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No posts yet.</div>}
      </div>
    </AppShell>
  );
}
