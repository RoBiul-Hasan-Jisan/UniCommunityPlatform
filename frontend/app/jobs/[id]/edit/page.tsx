"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../../components/AppShell";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/AuthContext";

const TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Remote"];
const CATEGORIES = ["Engineering", "Design", "Business", "Marketing", "Finance", "Research", "Operations", "Other"];

export default function EditJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    api(`/jobs/${id}`)
      .then(({ job }) => {
        setForm({
          title: job.title, company: job.company, location: job.location,
          type: job.type, category: job.category, description: job.description,
          requirementsText: (job.requirements || []).join("\n"),
          salaryRange: job.salaryRange, applyLink: job.applyLink, applyEmail: job.applyEmail,
          deadline: job.deadline ? job.deadline.slice(0, 10) : "",
          referralAvailable: !!job.referralAvailable, referralNote: job.referralNote || "",
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
      await api(`/jobs/${id}`, {
        method: "PUT",
        body: { ...form, requirements: form.requirementsText.split("\n").map((s) => s.trim()).filter(Boolean) },
      });
      router.push(`/jobs/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500 max-w-2xl">Couldn't load this job: {loadError}</div>
      </AppShell>
    );
  }
  if (!form) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Edit job posting</h1>
      </div>

      <form onSubmit={submit} className="card p-6 max-w-2xl space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Job title</label>
            <input className="input mt-1" required value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Company</label>
            <input className="input mt-1" required value={form.company} onChange={(e) => set("company", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Location</label>
            <input className="input mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Type</label>
            <select className="input mt-1" value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Category</label>
            <select className="input mt-1" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700">Description</label>
          <textarea className="input mt-1" rows={5} required value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700">Requirements (one per line)</label>
          <textarea className="input mt-1" rows={4} value={form.requirementsText} onChange={(e) => set("requirementsText", e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Salary range</label>
            <input className="input mt-1" value={form.salaryRange} onChange={(e) => set("salaryRange", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Application deadline</label>
            <input className="input mt-1" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Apply link</label>
            <input className="input mt-1" type="url" value={form.applyLink} onChange={(e) => set("applyLink", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Or apply email</label>
            <input className="input mt-1" type="email" value={form.applyEmail} onChange={(e) => set("applyEmail", e.target.value)} />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-brass-500" checked={form.referralAvailable} onChange={(e) => set("referralAvailable", e.target.checked)} />
            I can refer people internally for this role
          </label>
          {form.referralAvailable && (
            <input
              className="input mt-2 text-sm"
              placeholder="Optional note"
              value={form.referralNote}
              onChange={(e) => set("referralNote", e.target.value)}
            />
          )}
        </div>

        {error && <div className="text-sm text-crimson-500">{error}</div>}
        <div className="flex gap-2 pt-2">
          <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </AppShell>
  );
}
