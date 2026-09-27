"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getSocket } from "../../lib/socket";
import Avatar from "../../components/Avatar";

function fmt(date) {
  const d = new Date(date);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function OfficeHoursPage() {
  const { user, loading: authLoading } = useAuth();
  const [slots, setSlots] = useState([]);
  const [mine, setMine] = useState({ hosting: [], booked: [] });
  const [tab, setTab] = useState("browse"); // browse | mine
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", time: "", durationMinutes: 30, topic: "", mode: "Online", location: "" });
  const [submitting, setSubmitting] = useState(false);

  const canHost = user?.role === "alumni" || user?.role === "admin";

  async function load() {
    try {
      const [{ slots }, mineData] = await Promise.all([api("/office-hours"), api("/office-hours/mine")]);
      setSlots(slots);
      setMine(mineData);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function refresh() { load(); }
    socket.on("officeHours:new", refresh);
    socket.on("officeHours:updated", refresh);
    socket.on("officeHours:deleted", refresh);
    return () => {
      socket.off("officeHours:new", refresh);
      socket.off("officeHours:updated", refresh);
      socket.off("officeHours:deleted", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function submitSlot(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const datetime = new Date(`${form.date}T${form.time}`);
      await api("/office-hours", { method: "POST", body: { ...form, date: datetime.toISOString() } });
      setForm({ date: "", time: "", durationMinutes: 30, topic: "", mode: "Online", location: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function book(id) {
    try {
      await api(`/office-hours/${id}/book`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancel(id) {
    if (!confirm("Cancel this slot?")) return;
    try {
      await api(`/office-hours/${id}/cancel`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">Office Hours</h1>
          <p className="text-sm text-gray-500 mt-1">Book real time with an alumnus, or offer some of your own.</p>
        </div>
        {canHost && (
          <button className="btn-primary text-sm shrink-0" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Offer a slot"}
          </button>
        )}
      </div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={submitSlot} className="card-feature p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-ink-700">Date</label>
              <input className="input mt-1" type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">Time</label>
              <input className="input mt-1" type="time" required value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">Duration (min)</label>
              <input className="input mt-1" type="number" min="15" step="5" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink-700">Mode</label>
              <select className="input mt-1" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                <option>Online</option>
                <option>In-person</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700">{form.mode === "Online" ? "Call link" : "Location"}</label>
              <input className="input mt-1" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder={form.mode === "Online" ? "https://meet..." : "e.g. Cafeteria, 2nd floor"} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Topic (optional)</label>
            <input className="input mt-1" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} placeholder="e.g. Resume review, career advice, interview prep" />
          </div>
          <button className="btn-primary text-sm" type="submit" disabled={submitting}>{submitting ? "Posting…" : "Post slot"}</button>
        </form>
      )}

      <div className="flex mb-5 rounded-md bg-paper-dim p-1 text-sm font-medium w-fit">
        <button className={`px-4 py-1.5 rounded transition-colors ${tab === "browse" ? "bg-white shadow-card text-ink-800" : "text-gray-500"}`} onClick={() => setTab("browse")}>Browse slots</button>
        <button className={`px-4 py-1.5 rounded transition-colors ${tab === "mine" ? "bg-white shadow-card text-ink-800" : "text-gray-500"}`} onClick={() => setTab("mine")}>My office hours</button>
      </div>

      {tab === "browse" && (
        <div className="grid sm:grid-cols-2 gap-3">
          {slots.map((s) => (
            <div key={s._id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={s.host?.name} avatarUrl={s.host?.avatarUrl} className="w-10 h-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink-800 truncate">{s.host?.name}</div>
                  <div className="text-xs text-gray-500 truncate">{s.host?.currentPosition ? `${s.host.currentPosition} at ${s.host.currentCompany}` : s.host?.department}</div>
                </div>
              </div>
              {s.topic && <div className="text-sm text-ink-700 mt-2.5">{s.topic}</div>}
              <div className="text-xs text-gray-500 mt-2">{fmt(s.date)} · {s.durationMinutes} min · {s.mode}</div>
              {String(s.host?._id) !== String(user?._id) && (
                <button className="btn-primary text-xs mt-3" onClick={() => book(s._id)}>Book this slot</button>
              )}
            </div>
          ))}
          {slots.length === 0 && <div className="card p-8 text-center text-gray-400 text-sm col-span-2">No open slots right now — check back soon.</div>}
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-6">
          <div>
            <div className="section-label mb-2">Hosting</div>
            <div className="space-y-2">
              {mine.hosting.map((s) => (
                <div key={s._id} className="card p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink-800">{fmt(s.date)} · {s.durationMinutes} min</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {s.status === "booked" ? `Booked by ${s.bookedBy?.name}` : s.status === "cancelled" ? "Cancelled" : "Open"}
                      {s.topic ? ` · ${s.topic}` : ""}
                    </div>
                  </div>
                  {s.status !== "cancelled" && <button className="btn-secondary text-xs" onClick={() => cancel(s._id)}>Cancel</button>}
                </div>
              ))}
              {mine.hosting.length === 0 && <div className="text-sm text-gray-400">You haven't offered any slots yet.</div>}
            </div>
          </div>
          <div>
            <div className="section-label mb-2">Booked</div>
            <div className="space-y-2">
              {mine.booked.map((s) => (
                <div key={s._id} className="card p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink-800">{fmt(s.date)} with {s.host?.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.host?.currentPosition ? `${s.host.currentPosition} at ${s.host.currentCompany}` : ""} · {s.mode}</div>
                  </div>
                  {s.status === "booked" && <button className="btn-secondary text-xs" onClick={() => cancel(s._id)}>Cancel</button>}
                </div>
              ))}
              {mine.booked.length === 0 && <div className="text-sm text-gray-400">You haven't booked any office hours yet.</div>}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
