"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    api("/admin/activity")
      .then((d) => setActivity(d.activity))
      .catch((e) => setError(e.message));
  }, [authLoading, user]);

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">Activity Logs</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
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
