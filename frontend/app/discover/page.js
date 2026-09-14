"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";

export default function DiscoverPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      const { users } = await api(`/users?${params.toString()}`);
      setUsers(users);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function connect(userId) {
    setStatus((s) => ({ ...s, [userId]: "sending" }));
    try {
      await api("/connections/request", { method: "POST", body: { recipientId: userId } });
      setStatus((s) => ({ ...s, [userId]: "sent" }));
    } catch (e) {
      setStatus((s) => ({ ...s, [userId]: "error" }));
    }
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Discover people</h1>

      <div className="flex gap-2 mb-6">
        <input
          className="input"
          placeholder="Search by name, department, skill, company..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="alumni">Alumni</option>
        </select>
        <button className="btn-secondary" onClick={load}>Search</button>
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading...</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {users.map((u) => (
          <div key={u._id} className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <Link href={`/profile/${u._id}`} className="font-semibold hover:underline">{u.name}</Link>
                <div className="text-xs text-gray-500 capitalize mt-0.5">
                  {u.role} · {u.department}
                  {u.currentPosition ? ` · ${u.currentPosition} at ${u.currentCompany}` : ""}
                </div>
              </div>
              <button
                className="btn-secondary text-xs"
                disabled={status[u._id] === "sending" || status[u._id] === "sent"}
                onClick={() => connect(u._id)}
              >
                {status[u._id] === "sent" ? "Request sent" : status[u._id] === "sending" ? "Sending..." : "Connect"}
              </button>
            </div>
            {u.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {u.skills.slice(0, 4).map((s) => (
                  <span key={s} className="badge bg-gray-100 text-gray-600">{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {!loading && users.length === 0 && (
          <div className="text-gray-400 text-sm col-span-2 text-center py-6">No members found.</div>
        )}
      </div>
    </AppShell>
  );
}
