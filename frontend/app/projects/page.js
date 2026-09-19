"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getSocket } from "../../lib/socket";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const { projects } = await api(`/projects?${params.toString()}`);
      setProjects(projects);
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
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function onNew(project) {
      setProjects((ps) => (ps.some((p) => p._id === project._id) ? ps : [project, ...ps]));
    }
    function onDeleted({ projectId }) {
      setProjects((ps) => ps.filter((p) => p._id !== projectId));
    }
    function onStarred({ projectId, stars }) {
      setProjects((ps) => ps.map((p) => (p._id === projectId ? { ...p, stars } : p)));
    }
    socket.on("project:new", onNew);
    socket.on("project:deleted", onDeleted);
    socket.on("project:starred", onStarred);
    return () => {
      socket.off("project:new", onNew);
      socket.off("project:deleted", onDeleted);
      socket.off("project:starred", onStarred);
    };
  }, [authLoading, user]);

  async function toggleStar(id) {
    try {
      const { stars } = await api(`/projects/${id}/star`, { method: "POST" });
      setProjects((ps) => ps.map((p) => (p._id === id ? { ...p, stars } : p)));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">Project Showcase</h1>
          <p className="text-sm text-gray-500 mt-1">What people are building — browse, get feedback, get noticed.</p>
        </div>
        <Link href="/projects/create" className="btn-primary text-sm shrink-0">+ Share a project</Link>
      </div>

      <div className="flex gap-2 mb-6">
        <input className="input" placeholder="Search title, description, tech..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <button className="btn-secondary" onClick={load}>Search</button>
      </div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {projects.map((p) => {
          const starred = p.stars?.some((s) => s === user?._id || s?._id === user?._id);
          return (
            <div key={p._id} className="card card-interactive p-4">
              <Link href={`/projects/${p._id}`} className="block">
                <h3 className="font-semibold text-ink-800">{p.title}</h3>
                <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">{p.description}</p>
              </Link>
              {p.techStack?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {p.techStack.slice(0, 5).map((t) => <span key={t} className="badge bg-paper-dim text-gray-600">{t}</span>)}
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="avatar w-6 h-6 text-[10px] shrink-0">{initials(p.author?.name)}</span>
                  <span className="text-xs text-gray-500 truncate">{p.author?.name}</span>
                </div>
                <button onClick={() => toggleStar(p._id)} className={`flex items-center gap-1 text-xs shrink-0 ${starred ? "text-brass-600 font-semibold" : "text-gray-400 hover:text-brass-600"}`}>
                  ★ {p.stars?.length || 0}
                </button>
              </div>
            </div>
          );
        })}
        {!loading && projects.length === 0 && (
          <div className="card p-8 text-center text-gray-400 text-sm col-span-2">No projects shared yet — be the first.</div>
        )}
      </div>
    </AppShell>
  );
}
