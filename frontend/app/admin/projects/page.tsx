"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { projects } = await api("/admin/projects");
      setProjects(projects);
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
    if (!confirm("Delete this project?")) return;
    try {
      await api(`/admin/projects/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">All Projects</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {projects.map((p) => (
          <div key={p._id} className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/projects/${p._id}`} className="font-medium hover:underline">{p.title}</Link>
              <div className="text-xs text-gray-500">By {p.author?.name} ({p.author?.role})</div>
            </div>
            <button className="text-crimson-500 text-sm" onClick={() => remove(p._id)}>Delete</button>
          </div>
        ))}
        {projects.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No projects yet.</div>}
      </div>
    </AppShell>
  );
}
