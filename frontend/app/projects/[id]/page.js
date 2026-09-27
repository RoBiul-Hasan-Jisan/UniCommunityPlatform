"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { getSocket } from "../../../lib/socket";
import Avatar from "../../../components/Avatar";


export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState("");

  async function load() {
    try {
      const { project } = await api(`/projects/${id}`);
      setProject(project);
    } catch (e) {
      setLoadError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function onStarred({ projectId, stars }) {
      if (projectId !== id) return;
      setProject((p) => (p ? { ...p, stars } : p));
    }
    socket.on("project:starred", onStarred);
    return () => socket.off("project:starred", onStarred);
  }, [id, authLoading, user]);

  const isOwner = project && user && String(project.author._id) === String(user._id);
  const canManage = isOwner || user?.role === "admin";
  const starred = project?.stars?.some((s) => s === user?._id || s?._id === user?._id);

  async function toggleStar() {
    try {
      const { stars } = await api(`/projects/${id}/star`, { method: "POST" });
      setProject((p) => ({ ...p, stars }));
    } catch (e) {
      alert(e.message);
    }
  }

  async function remove() {
    if (!confirm("Delete this project?")) return;
    try {
      await api(`/projects/${id}`, { method: "DELETE" });
      router.push("/projects");
    } catch (e) {
      alert(e.message);
    }
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500 max-w-2xl">Couldn't load this project: {loadError}</div>
      </AppShell>
    );
  }
  if (!project) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <Link href="/projects" className="text-sm text-brass-600 hover:text-brass-700">&larr; All projects</Link>

      <div className="card-feature p-7 max-w-2xl mt-4">
        <div className="flex justify-between items-start gap-3">
          <h1 className="font-serif text-2xl text-ink-800">{project.title}</h1>
          <button onClick={toggleStar} className={`flex items-center gap-1 text-sm shrink-0 ${starred ? "text-brass-600 font-semibold" : "text-gray-400 hover:text-brass-600"}`}>
            ★ {project.stars?.length || 0}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Avatar name={project.author?.name} avatarUrl={project.author?.avatarUrl} className="w-7 h-7 text-xs" />
          <Link href={`/profile/${project.author._id}`} className="text-sm text-gray-600 hover:text-ink-800">{project.author?.name}</Link>
          <span className="text-xs text-gray-400 capitalize">· {project.author?.role}</span>
        </div>

        <p className="text-ink-700 mt-4 leading-relaxed whitespace-pre-wrap">{project.description}</p>

        {project.techStack?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {project.techStack.map((t) => <span key={t} className="badge bg-paper-dim text-gray-600">{t}</span>)}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-gray-100">
          {project.link && <a className="btn-primary" href={project.link} target="_blank" rel="noopener noreferrer">View live</a>}
          {project.repoLink && <a className="btn-secondary" href={project.repoLink} target="_blank" rel="noopener noreferrer">View code</a>}
          {canManage && <button className="btn-secondary text-crimson-500" onClick={remove}>Delete</button>}
        </div>
      </div>
    </AppShell>
  );
}
