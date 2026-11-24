"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function AdminEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { events } = await api("/admin/events");
      setEvents(events);
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
    if (!confirm("Delete this event?")) return;
    try {
      await api(`/admin/events/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">All Events</h1>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {events.map((ev) => (
          <div key={ev._id} className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/events/${ev._id}`} className="font-medium hover:underline">{ev.title}</Link>
              <div className="text-xs text-gray-500">{new Date(ev.date).toLocaleDateString()} · Hosted by {ev.host?.name} ({ev.host?.role})</div>
            </div>
            <button className="text-crimson-500 text-sm" onClick={() => remove(ev._id)}>Delete</button>
          </div>
        ))}
        {events.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No events yet.</div>}
      </div>
    </AppShell>
  );
}
