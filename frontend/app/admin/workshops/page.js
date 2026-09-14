"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";

export default function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState([]);

  async function load() {
    const { workshops } = await api("/admin/workshops");
    setWorkshops(workshops);
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!confirm("Delete this workshop?")) return;
    await api(`/admin/workshops/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">All Workshops</h1>
      <div className="card divide-y">
        {workshops.map((w) => (
          <div key={w._id} className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/workshops/${w._id}`} className="font-medium hover:underline">{w.title}</Link>
              <div className="text-xs text-gray-500">Hosted by {w.host?.name} · {new Date(w.date).toLocaleDateString()} · {w.status}</div>
            </div>
            <button className="text-red-600 text-sm" onClick={() => remove(w._id)}>Delete</button>
          </div>
        ))}
        {workshops.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No workshops yet.</div>}
      </div>
    </AppShell>
  );
}
