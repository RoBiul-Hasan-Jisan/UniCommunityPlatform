"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

export default function NetworkPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState({ accepted: [], incomingPending: [], outgoingPending: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const d = await api("/connections");
      setData(d);
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
  }, [authLoading, user]);

  async function accept(id) {
    try {
      await api(`/connections/${id}/accept`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function reject(id) {
    try {
      await api(`/connections/${id}/reject`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function remove(id) {
    if (!confirm("Remove this connection?")) return;
    try {
      await api(`/connections/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function message(otherUserId) {
    try {
      const { conversation } = await api("/messages/start", { method: "POST", body: { userId: otherUserId } });
      router.push(`/messages/${conversation._id}`);
    } catch (e) {
      setError(e.message);
    }
  }

  function other(conn) {
    return String(conn.requester._id) === String(user._id) ? conn.recipient : conn.requester;
  }

  if (loading || authLoading) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">My network</h1>
        <p className="text-sm text-gray-500 mt-1">People you're connected with across campus.</p>
      </div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      {data.incomingPending.length > 0 && (
        <section className="mb-6">
          <h2 className="section-label mb-2">Pending requests for you</h2>
          <div className="space-y-2">
            {data.incomingPending.map((c) => (
              <div key={c._id} className="card p-3 flex items-center justify-between">
                <div>
                  <Link href={`/profile/${c.requester._id}`} className="font-medium hover:underline">{c.requester.name}</Link>
                  <span className="text-xs text-gray-500 capitalize ml-2">{c.requester.role}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-xs" onClick={() => accept(c._id)}>Accept</button>
                  <button className="btn-secondary text-xs" onClick={() => reject(c._id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="section-label mb-2">Your connections ({data.accepted.length})</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {data.accepted.map((c) => {
            const o = other(c);
            return (
              <div key={c._id} className="card p-3 flex items-center justify-between">
                <div>
                  <Link href={`/profile/${o._id}`} className="font-medium hover:underline">{o.name}</Link>
                  <div className="text-xs text-gray-500 capitalize">{o.role} · {o.department}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs" onClick={() => message(o._id)}>Message</button>
                  <button className="text-xs text-crimson-400" onClick={() => remove(c._id)}>Remove</button>
                </div>
              </div>
            );
          })}
          {data.accepted.length === 0 && <div className="text-gray-400 text-sm">No connections yet — head to Discover to find people.</div>}
        </div>
      </section>

      {data.outgoingPending.length > 0 && (
        <section>
          <h2 className="section-label mb-2">Requests you've sent</h2>
          <div className="space-y-2">
            {data.outgoingPending.map((c) => (
              <div key={c._id} className="card p-3 flex items-center justify-between text-sm">
                <span>{c.recipient.name} <span className="text-gray-400">— pending</span></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
