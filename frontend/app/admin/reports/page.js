"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);

  async function load() {
    const { reports } = await api("/admin/reports");
    setReports(reports);
  }
  useEffect(() => { load(); }, []);

  async function resolve(id, status) {
    await api(`/admin/reports/${id}/resolve`, { method: "POST", body: { status } });
    load();
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Reports</h1>
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
