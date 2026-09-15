"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function WorkshopDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [workshop, setWorkshop] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [registrations, setRegistrations] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const { workshop } = await api(`/workshops/${id}`);
      setWorkshop(workshop);
    } catch (e) {
      setLoadError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  const isHost = workshop && user && String(workshop.host._id) === String(user._id);
  const canManage = isHost || user?.role === "admin";

  async function register() {
    setRegistering(true);
    setMessage("");
    try {
      await api("/registrations", { method: "POST", body: { workshopId: id } });
      setMessage("Registration Successful — this workshop has been added to your registered workshops.");
      load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setRegistering(false);
    }
  }

  async function loadRegistrations() {
    try {
      const { registrations } = await api(`/workshops/${id}/registrations`);
      setRegistrations(registrations);
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function remove() {
    if (!confirm("Delete this workshop?")) return;
    try {
      await api(`/workshops/${id}`, { method: "DELETE" });
      router.push("/workshops");
    } catch (e) {
      setMessage(e.message);
    }
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500 max-w-2xl">Couldn't load this workshop: {loadError}</div>
      </AppShell>
    );
  }

  if (!workshop) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="card-feature p-7 max-w-2xl">
        <div className="flex justify-between items-start gap-3">
          <h1 className="font-serif text-2xl text-ink-800">{workshop.title}</h1>
          <span className="badge border border-brass-300 text-brass-600 shrink-0">{workshop.category}</span>
        </div>
        <div className="text-sm text-gray-500 mt-1.5">
          Hosted by <span className="font-medium text-ink-700">{workshop.host?.name}</span> — {workshop.host?.role}
        </div>
        <p className="text-ink-700 mt-4 leading-relaxed">{workshop.description}</p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-5 pt-5 border-t border-gray-100 text-sm">
          <div><span className="text-gray-500">Date</span><br />{new Date(workshop.date).toLocaleDateString()}</div>
          <div><span className="text-gray-500">Time</span><br />{workshop.time}</div>
          <div><span className="text-gray-500">Duration</span><br />{workshop.durationMinutes} min</div>
          <div><span className="text-gray-500">Mode</span><br />{workshop.mode}</div>
          <div className="col-span-2"><span className="text-gray-500">Location / Link</span><br />{workshop.location}</div>
          <div><span className="text-gray-500">Available seats</span><br />{workshop.seatsLeft}</div>
          <div><span className="text-gray-500">Status</span><br /><span className="capitalize">{workshop.status}</span></div>
        </div>

        {message && <div className="mt-4 text-sm p-3 rounded-lg bg-brass-50 text-brass-700">{message}</div>}

        <div className="mt-5 flex gap-3">
          {!canManage && (
            <button className="btn-primary" onClick={register} disabled={registering || workshop.seatsLeft === 0}>
              {registering ? "Registering..." : workshop.seatsLeft === 0 ? "Workshop Full" : "Register"}
            </button>
          )}
          {canManage && (
            <>
              <button className="btn-secondary" onClick={loadRegistrations}>View Registrations</button>
              <button className="btn-secondary" onClick={() => router.push(`/workshops/${id}/edit`)}>Edit</button>
              <button className="text-crimson-500 text-sm" onClick={remove}>Delete</button>
            </>
          )}
        </div>

        {registrations && (
          <div className="mt-6 border-t pt-4">
            <h3 className="section-label mb-2">Registered participants ({registrations.length})</h3>
            <div className="space-y-1">
              {registrations.map((r) => (
                <div key={r._id} className="text-sm flex justify-between">
                  <span>{r.participant?.name} <span className="text-gray-400 capitalize">({r.participant?.role})</span></span>
                  <span className="text-gray-400 capitalize">{r.status}</span>
                </div>
              ))}
              {registrations.length === 0 && <div className="text-sm text-gray-400">No one has registered yet.</div>}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
