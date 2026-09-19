"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

const CATEGORIES = ["Reunion", "Meetup", "Networking", "Social", "Other"];

export default function CreateEventPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "", mode: "In-person", location: "", category: "Meetup", capacity: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { event } = await api("/events", { method: "POST", body: form });
      router.push(`/events/${event._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Host an event</h1>
        <p className="text-sm text-gray-500 mt-1">A reunion, a meetup, a casual get-together — put it on the community calendar.</p>
      </div>

      <form onSubmit={submit} className="card p-6 max-w-2xl space-y-4">
        <div>
          <label className="text-sm font-medium text-ink-700">Title</label>
          <input className="input mt-1" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Class of 2022 Reunion" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700">Description</label>
          <textarea className="input mt-1" rows={4} required value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What's happening, who should come" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Date</label>
            <input className="input mt-1" type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Time</label>
            <input className="input mt-1" value={form.time} onChange={(e) => set("time", e.target.value)} placeholder="e.g. 6:00 PM" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Category</label>
            <select className="input mt-1" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Mode</label>
            <select className="input mt-1" value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              <option>In-person</option>
              <option>Online</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">{form.mode === "Online" ? "Call link" : "Location"}</label>
            <input className="input mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder={form.mode === "Online" ? "https://meet..." : "e.g. Campus Auditorium"} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700">Capacity (optional)</label>
          <input className="input mt-1 w-40" type="number" min="0" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="Leave blank for unlimited" />
        </div>

        {error && <div className="text-sm text-crimson-500">{error}</div>}
        <div className="flex gap-2 pt-2">
          <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? "Posting…" : "Host event"}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </AppShell>
  );
}
