"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

const TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Remote"];
const CATEGORIES = ["Engineering", "Design", "Business", "Marketing", "Finance", "Research", "Operations", "Other"];

export default function CreateJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", company: "", location: "", type: "Full-time", category: "Engineering",
    description: "", requirementsText: "", salaryRange: "", applyLink: "", applyEmail: "", deadline: "",
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
      const { job } = await api("/jobs", {
        method: "POST",
        body: {
          ...form,
          requirements: form.requirementsText.split("\n").map((s) => s.trim()).filter(Boolean),
        },
      });
      router.push(`/jobs/${job._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Post a job</h1>
        <p className="text-sm text-gray-500 mt-1">Share an opening you've come across — everyone in the community will see it.</p>
      </div>

      <form onSubmit={submit} className="card p-6 max-w-2xl space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Job title</label>
            <input className="input mt-1" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Frontend Engineer" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Company</label>
            <input className="input mt-1" required value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Techverse Inc." />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Location</label>
            <input className="input mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City or Remote" />
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
          <textarea className="input mt-1" rows={5} required value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What's the role about?" />
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700">Requirements (one per line, optional)</label>
          <textarea className="input mt-1" rows={4} value={form.requirementsText} onChange={(e) => set("requirementsText", e.target.value)} placeholder={"3+ years of React\nStrong communication skills"} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Salary range (optional)</label>
            <input className="input mt-1" value={form.salaryRange} onChange={(e) => set("salaryRange", e.target.value)} placeholder="e.g. ৳40,000 – ৳60,000/mo" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Application deadline (optional)</label>
            <input className="input mt-1" type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Apply link</label>
            <input className="input mt-1" type="url" value={form.applyLink} onChange={(e) => set("applyLink", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Or apply email</label>
            <input className="input mt-1" type="email" value={form.applyEmail} onChange={(e) => set("applyEmail", e.target.value)} placeholder="hr@company.com" />
          </div>
        </div>
        <p className="text-xs text-gray-400">Add at least one way for people to apply — a link or an email.</p>

        {error && <div className="text-sm text-crimson-500">{error}</div>}
        <div className="flex gap-2 pt-2">
          <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? "Posting…" : "Post job"}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </AppShell>
  );
}
