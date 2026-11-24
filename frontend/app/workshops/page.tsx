"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

const CATEGORIES = ["Technical", "Career", "Research", "Entrepreneurship", "Academic", "Other"];

export default function WorkshopsPage() {
  const { user, loading: authLoading } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const q = category ? `?category=${encodeURIComponent(category)}` : "";
      const { workshops } = await api(`/workshops${q}`);
      setWorkshops(workshops);
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
  }, [category, authLoading, user]);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-ink-800">Alumni workshops</h1>
        <p className="text-sm text-gray-500 mt-1">Sessions led by graduates who've been where you're headed.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button className={`badge border ${category === "" ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setCategory("")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`badge border whitespace-nowrap ${category === c ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {workshops.map((w) => (
          <Link key={w._id} href={`/workshops/${w._id}`} className="card card-interactive p-4 block">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-ink-800">{w.title}</h3>
              <span className="badge border border-brass-300 text-brass-600 shrink-0">{w.category}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Hosted by {w.host?.name} · {new Date(w.date).toLocaleDateString()} at {w.time}
            </div>
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{w.description}</p>
            <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">{w.mode} · {w.seatsLeft} seats left</div>
          </Link>
        ))}
        {!loading && workshops.length === 0 && (
          <div className="text-gray-400 text-sm col-span-2 text-center py-10">No workshops found.</div>
        )}
      </div>
    </AppShell>
  );
}
