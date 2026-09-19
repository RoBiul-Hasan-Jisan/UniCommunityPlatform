"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getSocket } from "../../lib/socket";

const CATEGORIES = ["Reunion", "Meetup", "Networking", "Social", "Other"];

function fmtDate(date) {
  return new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function EventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      const { events } = await api(`/events?${params.toString()}`);
      setEvents(events);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function refresh() { load(); }
    socket.on("event:new", refresh);
    socket.on("event:rsvp", refresh);
    socket.on("event:deleted", refresh);
    return () => {
      socket.off("event:new", refresh);
      socket.off("event:rsvp", refresh);
      socket.off("event:deleted", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, category]);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">Events &amp; Meetups</h1>
          <p className="text-sm text-gray-500 mt-1">Reunions, meetups, and get-togethers hosted by the community.</p>
        </div>
        <Link href="/events/create" className="btn-primary text-sm shrink-0">+ Host an event</Link>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button className={`badge border ${category === "" ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setCategory("")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`badge border whitespace-nowrap ${category === c ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {events.map((ev) => {
          const going = ev.rsvps?.some((r) => r === user?._id || r?._id === user?._id);
          const full = ev.capacity > 0 && ev.rsvps?.length >= ev.capacity;
          return (
            <Link key={ev._id} href={`/events/${ev._id}`} className="card card-interactive p-4 block">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-800">{ev.title}</h3>
                  <div className="text-sm text-gray-600 mt-0.5">{fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}</div>
                </div>
                <span className="badge border border-brass-300 text-brass-600 shrink-0">{ev.category}</span>
              </div>
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">{ev.description}</p>
              <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
                <span>{ev.mode}{ev.location ? ` · ${ev.location}` : ""}</span>
                <span className={going ? "text-brass-600 font-semibold" : full ? "text-crimson-500" : ""}>
                  {going ? "✓ Going" : full ? "Full" : `${ev.rsvps?.length || 0} going`}
                </span>
              </div>
            </Link>
          );
        })}
        {!loading && events.length === 0 && (
          <div className="card p-8 text-center text-gray-400 text-sm col-span-2">No upcoming events — host one!</div>
        )}
      </div>
    </AppShell>
  );
}
