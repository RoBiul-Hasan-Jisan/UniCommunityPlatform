"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

const CATEGORIES = ["Technical", "Career", "Research", "Entrepreneurship", "Academic", "Other"];

export default function CreateWorkshopPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", description: "", category: "Technical", date: "", time: "",
    durationMinutes: 60, mode: "Online", location: "", maxParticipants: 50, registrationDeadline: "",
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
      const { workshop } = await api("/workshops", { method: "POST", body: form });
      router.push(`/workshops/${workshop._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (user && user.role === "student") {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-gray-600">Only alumni and admins can create workshops.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Create a Workshop</h1>
      <form onSubmit={submit} className="card p-6 space-y-4 max-w-2xl">
        <div>
          <label className="text-sm font-medium">Title</label>
          <input className="input mt-1" required value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea className="input mt-1" rows={3} required value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select className="input mt-1" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Mode</label>
            <select className="input mt-1" value={form.mode} onChange={(e) => set("mode", e.target.value)}>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Date</label>
            <input className="input mt-1" type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Time</label>
            <input className="input mt-1" placeholder="7:00 PM" required value={form.time} onChange={(e) => set("time", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Duration (minutes)</label>
            <input className="input mt-1" type="number" value={form.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium">Max participants</label>
            <input className="input mt-1" type="number" value={form.maxParticipants} onChange={(e) => set("maxParticipants", Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Location / Meeting Link</label>
          <input className="input mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Registration deadline</label>
          <input className="input mt-1" type="date" value={form.registrationDeadline} onChange={(e) => set("registrationDeadline", e.target.value)} />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="btn-primary" disabled={submitting} type="submit">
          {submitting ? "Creating..." : "Create Workshop"}
        </button>
      </form>
    </AppShell>
  );
}
