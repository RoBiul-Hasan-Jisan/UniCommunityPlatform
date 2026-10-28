"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../../components/AppShell";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/AuthContext";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !currentUser) return;
    api(`/admin/users/${id}`)
      .then(({ user }) => setForm(user))
      .catch((e) => setError(e.message));
  }, [id, authLoading, currentUser]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { user } = await api(`/admin/users/${id}`, { method: "PUT", body: form });
      setForm(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500">Couldn't load this user: {error}</div>
      </AppShell>
    );
  }

  if (!form) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <button className="text-sm text-brand-600 mb-3" onClick={() => router.push("/admin/users")}>&larr; Back to users</button>
      <h1 className="font-serif text-2xl text-ink-800 mb-4">Edit User</h1>

      <div className="card p-6 max-w-2xl space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input className="input mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input className="input mt-1" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <select className="input mt-1" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="student">Student</option>
              <option value="alumni">Alumni</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Department</label>
            <input className="input mt-1" value={form.department || ""} onChange={(e) => set("department", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select className="input mt-1" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.verified} onChange={(e) => set("verified", e.target.checked)} />
          Verified member (shows a ✓ badge next to their name)
        </label>

        <div>
          <label className="text-sm font-medium">About</label>
          <textarea className="input mt-1" rows={3} value={form.about || ""} onChange={(e) => set("about", e.target.value)} />
        </div>

        {error && <div className="text-sm text-crimson-500">{error}</div>}
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </AppShell>
  );
}
