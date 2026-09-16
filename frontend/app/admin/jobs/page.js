"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminJobsPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { jobs } = await api("/admin/jobs");
      setJobs(jobs);
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
    if (!confirm("Delete this job posting?")) return;
    try {
      await api(`/admin/jobs/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">All Job Postings</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {jobs.map((j) => (
          <div key={j._id} className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/jobs/${j._id}`} className="font-medium hover:underline">{j.title}</Link>
              <div className="text-xs text-gray-500">{j.company} · Posted by {j.postedBy?.name} ({j.postedBy?.role}) · {j.status}</div>
            </div>
            <button className="text-crimson-500 text-sm" onClick={() => remove(j._id)}>Delete</button>
          </div>
        ))}
        {jobs.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No job postings yet.</div>}
      </div>
    </AppShell>
  );
}
