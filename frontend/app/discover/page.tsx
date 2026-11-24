"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { usePresence, PresenceDot } from "../../lib/usePresence";
import Avatar from "../../components/Avatar";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function DiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ department: "", graduationYear: "", company: "", industry: "", location: "", verified: false });
  const [facets, setFacets] = useState({ departments: [], graduationYears: [], industries: [] });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const online = usePresence(users.map((u) => u._id));

  function buildParams(pageNo) {
    const params = new URLSearchParams({ page: String(pageNo) });
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, String(v));
    return params.toString();
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await api(`/users?${buildParams(next)}`);
      setUsers((us) => [...us, ...d.users.filter((n) => !us.some((u) => u._id === n._id))]);
      setPage(next);
      setHasMore(d.hasMore);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    api("/users/facets").then(setFacets).catch(() => {});
  }, [authLoading, user]);

  async function load() {
    setLoading(true);
    try {
      const d = await api(`/users?${buildParams(1)}`);
      setUsers(d.users);
      setPage(1);
      setHasMore(d.hasMore);
      setTotal(d.total);
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
  }, [role, filters.department, filters.graduationYear, filters.industry, filters.verified, authLoading, user]);

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
        <button className="btn-secondary" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>Filters</button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-6 grid sm:grid-cols-3 gap-3">
          <label className="text-xs text-gray-500">Department
            <select className="input mt-1" value={filters.department} onChange={(e) => setF("department", e.target.value)}>
              <option value="">Any</option>
              {facets.departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500">Graduation year
            <select className="input mt-1" value={filters.graduationYear} onChange={(e) => setF("graduationYear", e.target.value)}>
              <option value="">Any</option>
              {facets.graduationYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500">Industry
            <select className="input mt-1" value={filters.industry} onChange={(e) => setF("industry", e.target.value)}>
              <option value="">Any</option>
              {facets.industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500">Company
            <input className="input mt-1" placeholder="e.g. Google" value={filters.company} onChange={(e) => setF("company", e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </label>
          <label className="text-xs text-gray-500">City / country
            <input className="input mt-1" placeholder="e.g. Dhaka" value={filters.location} onChange={(e) => setF("location", e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
          </label>
          <label className="text-xs text-gray-500 flex items-end gap-2 pb-2">
            <input type="checkbox" checked={filters.verified} onChange={(e) => setF("verified", e.target.checked)} /> Verified members only
          </label>
          <div className="sm:col-span-3 flex gap-2">
            <button className="btn-primary text-xs" onClick={load}>Apply</button>
            <button className="btn-secondary text-xs" onClick={() => { setFilters({ department: "", graduationYear: "", company: "", industry: "", location: "", verified: false }); setTimeout(load, 0); }}>Reset</button>
          </div>
        </div>
      )}

      {!loading && total > 0 && <div className="text-xs text-gray-400 mb-3">{total} member{total === 1 ? "" : "s"} found</div>}

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {users.map((u) => (
          <div key={u._id} className="card card-interactive p-4 flex items-start gap-3">
            <span className="relative inline-block shrink-0">
              <Avatar name={u.name} avatarUrl={u.avatarUrl} className="w-10 h-10 text-sm mt-0.5" />
              <PresenceDot online={online.has(u._id)} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <Link href={`/profile/${u._id}`} className="font-semibold text-ink-800 hover:text-brass-600 truncate block">{u.name} <VerifiedBadge show={u.verified} /></Link>
                  <div className="text-xs text-gray-500 capitalize mt-0.5">
                    {u.role} · {u.department}
                    {u.currentPosition ? ` · ${u.currentPosition} at ${u.currentCompany}` : ""}
                    {u.location ? ` · ${u.location}` : ""}
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
      {hasMore && !loading && (
        <div className="text-center mt-5">
          <button className="btn-secondary text-sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </AppShell>
  );
}
