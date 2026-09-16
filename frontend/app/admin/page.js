"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <div className="font-serif text-3xl text-brass-200">{value}</div>
      <div className="text-xs text-ink-200 mt-1">{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Don't call the API until we know who's logged in — calling before the
    // auth check resolves (or with no session at all) used to throw an
    // unhandled "Missing auth token" error instead of failing gracefully.
    if (authLoading || !user) return;
    api("/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [authLoading, user]);

  if (error) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500">Couldn't load the dashboard: {error}</div>
      </AppShell>
    );
  }

  if (!data) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  const t = data.totals;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Admin dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">The registrar's view of the whole community.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Students" value={t.totalStudents} />
        <Stat label="Alumni" value={t.totalAlumni} />
        <Stat label="Total Users" value={t.totalUsers} />
        <Stat label="Workshops" value={t.totalWorkshops} />
        <Stat label="Job Postings" value={t.totalJobs} />
        <Stat label="Registrations" value={t.totalRegistrations} />
        <Stat label="Posts" value={t.totalPosts} />
        <Stat label="Connections" value={t.totalConnections} />
        <Stat label="Mentorship Requests" value={t.totalMentorship} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="section-label mb-2">Recent Users</h2>
          <div className="card divide-y">
            {data.recentUsers.map((u) => (
              <div key={u._id} className="p-3 flex justify-between text-sm">
                <span>{u.name}</span>
                <span className="text-gray-400 capitalize">{u.role} · {u.department}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-label mb-2">Recent Workshops</h2>
          <div className="card divide-y">
            {data.recentWorkshops.map((w) => (
              <div key={w._id} className="p-3 flex justify-between text-sm">
                <span>{w.title}</span>
                <span className="text-gray-400">{w.host?.name}</span>
              </div>
            ))}
            {data.recentWorkshops.length === 0 && <div className="p-3 text-sm text-gray-400">No workshops yet.</div>}
          </div>
        </section>

        <section>
          <h2 className="section-label mb-2">Recent Posts</h2>
          <div className="card divide-y">
            {data.recentPosts.map((p) => (
              <div key={p._id} className="p-3 text-sm">
                <div className="text-gray-400 text-xs">{p.author?.name}</div>
                <div className="line-clamp-1">{p.content}</div>
              </div>
            ))}
            {data.recentPosts.length === 0 && <div className="p-3 text-sm text-gray-400">No posts yet.</div>}
          </div>
        </section>

        <section>
          <h2 className="section-label mb-2">Recent Activity</h2>
          <div className="card divide-y">
            {data.recentActivity.map((a) => (
              <div key={a._id} className="p-3 text-sm">
                <span className="font-medium">{a.actor?.name || "Someone"}</span> {a.action}
                <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {data.recentActivity.length === 0 && <div className="p-3 text-sm text-gray-400">No activity yet.</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
