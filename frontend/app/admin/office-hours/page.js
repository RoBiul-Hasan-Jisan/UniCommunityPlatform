"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminOfficeHoursPage() {
  const { user, loading: authLoading } = useAuth();
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { slots } = await api("/admin/office-hours");
      setSlots(slots);
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
    if (!confirm("Delete this slot?")) return;
    try {
      await api(`/admin/office-hours/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">All Office Hours</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {slots.map((s) => (
          <div key={s._id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{new Date(s.date).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Host: {s.host?.name} ({s.host?.role}) · {s.status}{s.bookedBy ? ` · Booked by ${s.bookedBy.name}` : ""}</div>
            </div>
            <button className="text-crimson-500 text-sm" onClick={() => remove(s._id)}>Delete</button>
          </div>
        ))}
        {slots.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No office hours yet.</div>}
      </div>
    </AppShell>
  );
}
