"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

const emptyForm = { name: "", email: "", role: "student", department: "", password: "" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role !== "all") params.set("role", role);
      const { users } = await api(`/admin/users?${params.toString()}`);
      setUsers(users);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function addUser(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/admin/users", { method: "POST", body: form });
      setForm(emptyForm);
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStatus(id) {
    await api(`/admin/users/${id}/toggle-status`, { method: "POST" });
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    await api(`/admin/users/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Users</h1>
        <button className="btn-primary text-sm" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addUser} className="card p-4 mb-4 grid sm:grid-cols-2 gap-3">
          <input className="input" placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="student">Student</option>
            <option value="alumni">Alumni</option>
            <option value="admin">Admin</option>
          </select>
          <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="input" placeholder="Temporary password (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <div className="text-sm text-red-600 sm:col-span-2">{error}</div>}
          <button className="btn-primary sm:col-span-2" type="submit">Create User</button>
        </form>
      )}

      <div className="flex gap-2 mb-4">
        <input className="input" placeholder="Search users..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <div className="flex gap-1">
          {["all", "student", "alumni", "admin"].map((r) => (
            <button key={r} className={`badge whitespace-nowrap ${role === r ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"}`} onClick={() => setRole(r)}>
              {r === "all" ? "All" : r[0].toUpperCase() + r.slice(1) + "s"}
            </button>
          ))}
        </div>
        <button className="btn-secondary" onClick={load}>Search</button>
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading...</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u._id}>
                <td className="p-3 font-medium">{u.name}<div className="text-xs text-gray-400">{u.email}</div></td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">{u.department}</td>
                <td className="p-3">
                  <span className={`badge ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{u.status}</span>
                </td>
                <td className="p-3 space-x-2">
                  <Link href={`/admin/users/${u._id}`} className="text-brand-600">View/Edit</Link>
                  <button className="text-gray-500" onClick={() => toggleStatus(u._id)}>
                    {u.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button className="text-red-600" onClick={() => remove(u._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && users.length === 0 && <div className="p-6 text-center text-gray-400 text-sm">No users found.</div>}
      </div>
    </AppShell>
  );
}
