"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

export default function CreateProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", techStackText: "", link: "", repoLink: "" });
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
      const { project } = await api("/projects", {
        method: "POST",
        body: { ...form, techStack: form.techStackText.split(",").map((s) => s.trim()).filter(Boolean) },
      });
      router.push(`/projects/${project._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Share a project</h1>
        <p className="text-sm text-gray-500 mt-1">Something you built — a class project, a side project, anything you're proud of.</p>
      </div>

      <form onSubmit={submit} className="card p-6 max-w-2xl space-y-4">
        <div>
          <label className="text-sm font-medium text-ink-700">Title</label>
          <input className="input mt-1" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Campus Room Finder" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700">Description</label>
          <textarea className="input mt-1" rows={5} required value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What it does, why you built it, what was hard about it" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink-700">Tech stack (comma-separated)</label>
          <input className="input mt-1" value={form.techStackText} onChange={(e) => set("techStackText", e.target.value)} placeholder="React, Node.js, MongoDB" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Live demo link (optional)</label>
            <input className="input mt-1" type="url" value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Repo link (optional)</label>
            <input className="input mt-1" type="url" value={form.repoLink} onChange={(e) => set("repoLink", e.target.value)} placeholder="https://github.com/..." />
          </div>
        </div>

        {error && <div className="text-sm text-crimson-500">{error}</div>}
        <div className="flex gap-2 pt-2">
          <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? "Sharing…" : "Share project"}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </AppShell>
  );
}
