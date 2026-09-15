"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { reports } = await api("/admin/reports");
      setReports(reports);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function resolve(id, status) {
    try {
      await api(`/admin/reports/${id}/resolve`, { method: "POST", body: { status } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">Reports</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {reports.map((r) => (
          <div key={r._id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-500 capitalize">
                {r.targetType} reported by {r.reporter?.name} · <span className="capitalize">{r.status}</span>
              </div>
              <div className="text-sm mt-1">{r.reason}</div>
            </div>
            {r.status === "open" && (
              <div className="flex gap-2 whitespace-nowrap">
                <button className="btn-secondary text-xs" onClick={() => resolve(r._id, "resolved")}>Resolve</button>
                <button className="text-xs text-gray-500" onClick={() => resolve(r._id, "dismissed")}>Dismiss</button>
              </div>
            )}
          </div>
        ))}
        {reports.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No reports yet.</div>}
      </div>
    </AppShell>
  );
}
