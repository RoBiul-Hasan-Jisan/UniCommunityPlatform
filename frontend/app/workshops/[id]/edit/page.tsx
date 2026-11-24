"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../../components/AppShell";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/AuthContext";

export default function EditWorkshopPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    api(`/workshops/${id}`)
      .then(({ workshop }) => {
        setForm({
          title: workshop.title,
          description: workshop.description,
          category: workshop.category,
          date: workshop.date?.slice(0, 10),
          time: workshop.time,
          durationMinutes: workshop.durationMinutes,
          mode: workshop.mode,
          location: workshop.location,
          maxParticipants: workshop.maxParticipants,
          status: workshop.status,
        });
      })
      .catch((e) => setLoadError(e.message));
  }, [id, authLoading, user]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api(`/workshops/${id}`, { method: "PUT", body: form });
      router.push(`/workshops/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500 max-w-2xl">Couldn't load this workshop: {loadError}</div>
      </AppShell>
    );
  }

  if (!form) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">Edit Workshop</h1>
      <form onSubmit={submit} className="card p-6 space-y-4 max-w-2xl">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input className="input mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea className="input mt-1" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input className="input mt-1" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Time</label>
            <input className="input mt-1" value={form.time} onChange={(e) => set("time", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Max participants</label>
            <input className="input mt-1" type="number" value={form.maxParticipants} onChange={(e) => set("maxParticipants", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select className="input mt-1" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Location / Meeting Link</label>
          <input className="input mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        {error && <div className="text-sm text-crimson-500">{error}</div>}
        <button className="btn-primary" disabled={submitting} type="submit">
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </AppShell>
  );
}
