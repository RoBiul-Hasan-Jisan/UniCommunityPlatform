"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { usePresence, PresenceDot } from "../../lib/usePresence";

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const online = usePresence(users.map((u) => u._id));

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      const { users } = await api(`/users?${params.toString()}`);
      setUsers(users);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, authLoading, user]);

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
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Discover people</h1>
        <p className="text-sm text-gray-500 mt-1">Search the directory by name, department, skill, or company.</p>
      </div>

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

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {users.map((u) => (
          <div key={u._id} className="card card-interactive p-4 flex items-start gap-3">
            <span className="relative inline-block shrink-0">
              <span className="avatar w-10 h-10 text-sm mt-0.5">{(u.name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
              <PresenceDot online={online.has(u._id)} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <Link href={`/profile/${u._id}`} className="font-semibold text-ink-800 hover:text-brass-600 truncate block">{u.name}</Link>
                  <div className="text-xs text-gray-500 capitalize mt-0.5">
                    {u.role} · {u.department}
                    {u.currentPosition ? ` · ${u.currentPosition} at ${u.currentCompany}` : ""}
                  </div>
                </div>
                <button
                  className="btn-secondary text-xs shrink-0"
                  disabled={status[u._id] === "sending" || status[u._id] === "sent"}
                  onClick={() => connect(u._id)}
                >
                  {status[u._id] === "sent" ? "Request sent" : status[u._id] === "sending" ? "Sending…" : "Connect"}
                </button>
              </div>
              {u.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {u.skills.slice(0, 4).map((s) => (
                    <span key={s} className="badge bg-paper-dim text-gray-600">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <div className="text-gray-400 text-sm col-span-2 text-center py-10">No members found.</div>
        )}
      </div>
    </AppShell>
  );
}
