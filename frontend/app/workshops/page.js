"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";

const CATEGORIES = ["Technical", "Career", "Research", "Entrepreneurship", "Academic", "Other"];

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const q = category ? `?category=${encodeURIComponent(category)}` : "";
      const { workshops } = await api(`/workshops${q}`);
      setWorkshops(workshops);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Alumni Workshops</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button className={`badge ${category === "" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"}`} onClick={() => setCategory("")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`badge whitespace-nowrap ${category === c ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading...</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {workshops.map((w) => (
          <Link key={w._id} href={`/workshops/${w._id}`} className="card p-4 block hover:border-brand-500 transition">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{w.title}</h3>
              <span className="badge bg-gray-100 text-gray-600">{w.category}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Hosted by {w.host?.name} · {new Date(w.date).toLocaleDateString()} at {w.time}
            </div>
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{w.description}</p>
            <div className="text-xs text-gray-500 mt-2">{w.mode} · {w.seatsLeft} seats left</div>
          </Link>
        ))}
        {!loading && workshops.length === 0 && (
          <div className="text-gray-400 text-sm col-span-2 text-center py-6">No workshops found.</div>
        )}
      </div>
    </AppShell>
  );
}
