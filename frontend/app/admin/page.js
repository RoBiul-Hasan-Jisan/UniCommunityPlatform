"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { api, downloadFile } from "../../lib/api";
import MiniChart from "../../components/MiniChart";
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
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    // Don't call the API until we know who's logged in — calling before the
    // auth check resolves (or with no session at all) used to throw an
    // unhandled "Missing auth token" error instead of failing gracefully.
    if (authLoading || !user) return;
    api("/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    api(`/admin/analytics?days=${days}`).then(setAnalytics).catch(() => {});
  }, [authLoading, user, days]);

  async function exportCsv(path, filename) {
    setExportError("");
    try { await downloadFile(path, filename); } catch (e) { setExportError(e.message); }
  }

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
        <Stat label="Office Hours" value={t.totalOfficeHours} />
        <Stat label="Projects" value={t.totalProjects} />
        <Stat label="Events" value={t.totalEvents} />
        <Stat label="Registrations" value={t.totalRegistrations} />
        <Stat label="Posts" value={t.totalPosts} />
        <Stat label="Connections" value={t.totalConnections} />
        <Stat label="Mentorship Requests" value={t.totalMentorship} />
      </div>

      {analytics && (
        <section className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="section-label">Activity — last {analytics.days} days</h2>
            <div className="flex gap-1.5">
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => setDays(d)} className={`badge border ${days === d ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`}>{d}d</button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["New signups", "signups", "#AB812E"],
              ["New posts", "posts", "#3B4361"],
              ["Connections made", "connections", "#8C2F39"],
              ["Workshop registrations", "registrations", "#5B8C6E"],
            ].map(([label, key, color]) => (
              <div key={key} className="card p-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-700 font-medium">{label}</span>
                  <span className="text-gray-500">{analytics.series[key].reduce((a, b) => a + b, 0)}</span>
                </div>
                <MiniChart labels={analytics.labels} values={analytics.series[key]} color={color} title={label} />
              </div>
            ))}
          </div>
          {analytics.openReports > 0 && (
            <a href="/admin/reports" className="inline-block mt-3 text-sm text-crimson-500 hover:underline">⚑ {analytics.openReports} open report{analytics.openReports === 1 ? "" : "s"} waiting for review →</a>
          )}
        </section>
      )}

      <section className="mb-10">
        <h2 className="section-label mb-2">Export data (CSV)</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-xs" onClick={() => exportCsv("/admin/export/users.csv", "users.csv")}>⬇ Users</button>
          <button className="btn-secondary text-xs" onClick={() => exportCsv("/admin/export/registrations.csv", "registrations.csv")}>⬇ Workshop registrations</button>
          <button className="btn-secondary text-xs" onClick={() => exportCsv("/admin/export/activity.csv", "activity.csv")}>⬇ Audit log</button>
        </div>
        {exportError && <div className="text-xs text-crimson-500 mt-2">{exportError}</div>}
      </section>

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
