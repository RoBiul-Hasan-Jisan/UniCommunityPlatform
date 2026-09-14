"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

export default function AdminActivityPage() {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    api("/admin/activity").then((d) => setActivity(d.activity));
  }, []);

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Activity Logs</h1>
      <div className="card divide-y">
        {activity.map((a) => (
          <div key={a._id} className="p-4 text-sm">
            <span className="font-medium">{a.actor?.name || "Someone"}</span>{" "}
            <span className="capitalize text-gray-500">({a.actor?.role})</span> {a.action}
            <div className="text-xs text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {activity.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No activity yet.</div>}
      </div>
    </AppShell>
  );
}
