"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getSocket } from "../../lib/socket";

const TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Remote"];
const CATEGORIES = ["Engineering", "Design", "Business", "Marketing", "Finance", "Research", "Operations", "Other"];

function timeAgo(date) {
  const d = new Date(date);
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function JobsPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCount, setNewCount] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      const { jobs } = await api(`/jobs?${params.toString()}`);
      setJobs(jobs);
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
  }, [type, authLoading, user]);

  // New postings, status changes, and removals appear live for everyone
  // browsing the board — no refresh needed, same as the feed.
  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function onNew(job) {
      if (type && job.type !== type) return;
      setJobs((js) => (js.some((j) => j._id === job._id) ? js : [job, ...js]));
      setNewCount((n) => n + 1);
      setTimeout(() => setNewCount((n) => Math.max(0, n - 1)), 1500);
    }
    function onUpdated(job) {
      setJobs((js) => js.map((j) => (j._id === job._id ? job : j)));
    }
    function onDeleted({ jobId }) {
      setJobs((js) => js.filter((j) => j._id !== jobId));
    }
    socket.on("job:new", onNew);
    socket.on("job:updated", onUpdated);
    socket.on("job:deleted", onDeleted);
    return () => {
      socket.off("job:new", onNew);
      socket.off("job:updated", onUpdated);
      socket.off("job:deleted", onDeleted);
    };
  }, [authLoading, user, type]);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">Job board</h1>
          <p className="text-sm text-gray-500 mt-1">Openings shared by students, alumni, and the university — all in one place.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className={`w-1.5 h-1.5 rounded-full ${newCount > 0 ? "bg-brass-500 animate-pulse" : "bg-gray-300"}`} />
            Live
          </span>
          <Link href="/jobs/create" className="btn-primary text-sm">+ Post a job</Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="input"
          placeholder="Search title, company, location..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn-secondary" onClick={load}>Search</button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button className={`badge border ${type === "" ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setType("")}>All</button>
        {TYPES.map((t) => (
          <button key={t} className={`badge border whitespace-nowrap ${type === t ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="space-y-3">
        {jobs.map((j) => (
          <Link key={j._id} href={`/jobs/${j._id}`} className={`card card-interactive p-4 block ${j.status === "closed" ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink-800">{j.title}</h3>
                <div className="text-sm text-gray-600 mt-0.5">{j.company}{j.location ? ` · ${j.location}` : ""}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="badge border border-brass-300 text-brass-600">{j.type}</span>
                {j.status === "closed" && <span className="badge border border-gray-300 text-gray-500">Closed</span>}
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{j.description}</p>
            <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100 flex justify-between">
              <span>Posted by {j.postedBy?.name} ({j.postedBy?.role})</span>
              <span>{timeAgo(j.createdAt)}</span>
            </div>
          </Link>
        ))}
        {!loading && jobs.length === 0 && (
          <div className="card p-8 text-center text-gray-400 text-sm">No job postings yet — be the first to share one.</div>
        )}
      </div>
    </AppShell>
  );
}
