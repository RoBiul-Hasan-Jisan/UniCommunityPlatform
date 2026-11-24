"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminWorkshopsPage() {
  const { user, loading: authLoading } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { workshops } = await api("/admin/workshops");
      setWorkshops(workshops);
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
    if (!confirm("Delete this workshop?")) return;
    try {
      await api(`/admin/workshops/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">All Workshops</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {workshops.map((w) => (
          <div key={w._id} className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/workshops/${w._id}`} className="font-medium hover:underline">{w.title}</Link>
              <div className="text-xs text-gray-500">Hosted by {w.host?.name} · {new Date(w.date).toLocaleDateString()} · {w.status}</div>
            </div>
            <button className="text-crimson-500 text-sm" onClick={() => remove(w._id)}>Delete</button>
          </div>
        ))}
        {workshops.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No workshops yet.</div>}
      </div>
    </AppShell>
  );
}
