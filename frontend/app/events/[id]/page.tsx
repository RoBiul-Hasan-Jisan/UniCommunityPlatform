"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { getSocket } from "../../../lib/socket";
import Avatar from "../../../components/Avatar";
import { downloadIcs } from "../../../lib/ics";


export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [rsvping, setRsvping] = useState(false);

  async function load() {
    try {
      const { event } = await api(`/events/${id}`);
      setEvent(event);
    } catch (e) {
      setLoadError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function onUpdate({ eventId }) {
      if (eventId === id) load();
    }
    socket.on("event:rsvp", onUpdate);
    socket.on("event:updated", onUpdate);
    return () => {
      socket.off("event:rsvp", onUpdate);
      socket.off("event:updated", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  const isOwner = event && user && String(event.host._id) === String(user._id);
  const canManage = isOwner || user?.role === "admin";
  const going = event?.rsvps?.some((r) => String(r._id) === String(user?._id));
  const full = event?.capacity > 0 && event?.rsvps?.length >= event.capacity;

  async function toggleRsvp() {
    setRsvping(true);
    try {
      await api(`/events/${id}/rsvp`, { method: "POST" });
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setRsvping(false);
    }
  }

  async function remove() {
    if (!confirm("Cancel this event?")) return;
    try {
      await api(`/events/${id}`, { method: "DELETE" });
      router.push("/events");
    } catch (e) {
      alert(e.message);
    }
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500 max-w-2xl">Couldn't load this event: {loadError}</div>
      </AppShell>
    );
  }
  if (!event) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <Link href="/events" className="text-sm text-brass-600 hover:text-brass-700">&larr; All events</Link>

      <div className="card-feature p-7 max-w-2xl mt-4">
        <div className="flex justify-between items-start gap-3">
          <h1 className="font-serif text-2xl text-ink-800">{event.title}</h1>
          <span className="badge border border-brass-300 text-brass-600 shrink-0">{event.category}</span>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {new Date(event.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          {event.time ? ` · ${event.time}` : ""}
        </div>

        <p className="text-ink-700 mt-4 leading-relaxed whitespace-pre-wrap">{event.description}</p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-5 pt-5 border-t border-gray-100 text-sm">
          <div><span className="text-gray-500">Mode</span><br />{event.mode}</div>
          {event.location && <div><span className="text-gray-500">{event.mode === "Online" ? "Link" : "Location"}</span><br />{event.location}</div>}
          <div><span className="text-gray-500">Hosted by</span><br />{event.host?.name}</div>
          <div><span className="text-gray-500">Attending</span><br />{event.rsvps?.length || 0}{event.capacity > 0 ? ` / ${event.capacity}` : ""}</div>
        </div>

        {event.rsvps?.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="text-sm font-medium text-ink-700 mb-2">Who's going</div>
            <div className="flex flex-wrap gap-2">
              {event.rsvps.map((r) => (
                <div key={r._id} className="flex items-center gap-1.5 bg-paper-dim rounded-full pl-1 pr-2.5 py-1">
                  <Avatar name={r.name} avatarUrl={r.avatarUrl} className="w-5 h-5 text-[9px]" />
                  <span className="text-xs text-gray-700">{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-gray-100">
          <button className={going ? "btn-secondary" : "btn-primary"} onClick={toggleRsvp} disabled={rsvping || (full && !going)}>
            {going ? "Cancel RSVP" : full ? "Event full" : "RSVP"}
          </button>
          <button className="btn-secondary" onClick={() => downloadIcs(event)}>📅 Add to calendar</button>
          {canManage && <button className="btn-secondary text-crimson-500" onClick={remove}>Delete event</button>}
        </div>
      </div>
    </AppShell>
  );
}
