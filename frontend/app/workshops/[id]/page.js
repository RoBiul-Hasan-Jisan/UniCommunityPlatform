"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function WorkshopDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [workshop, setWorkshop] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { workshop } = await api(`/workshops/${id}`);
    setWorkshop(workshop);
  }

  useEffect(() => { load(); }, [id]);

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
    const { registrations } = await api(`/workshops/${id}/registrations`);
    setRegistrations(registrations);
  }

  async function remove() {
    if (!confirm("Delete this workshop?")) return;
    await api(`/workshops/${id}`, { method: "DELETE" });
    router.push("/workshops");
  }

  if (!workshop) return <AppShell><div className="text-gray-400 text-sm">Loading...</div></AppShell>;

  return (
    <AppShell>
      <div className="card p-6 max-w-2xl">
        <div className="flex justify-between items-start">
          <h1 className="text-xl font-bold">{workshop.title}</h1>
          <span className="badge bg-gray-100 text-gray-600">{workshop.category}</span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Hosted by <span className="font-medium">{workshop.host?.name}</span> — {workshop.host?.role}
        </div>
        <p className="text-gray-700 mt-4">{workshop.description}</p>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div><span className="text-gray-500">Date:</span> {new Date(workshop.date).toLocaleDateString()}</div>
          <div><span className="text-gray-500">Time:</span> {workshop.time}</div>
          <div><span className="text-gray-500">Duration:</span> {workshop.durationMinutes} min</div>
          <div><span className="text-gray-500">Mode:</span> {workshop.mode}</div>
          <div className="col-span-2"><span className="text-gray-500">Location/Link:</span> {workshop.location}</div>
          <div><span className="text-gray-500">Available Seats:</span> {workshop.seatsLeft}</div>
          <div><span className="text-gray-500">Status:</span> {workshop.status}</div>
        </div>

        {message && <div className="mt-4 text-sm p-3 rounded-lg bg-green-50 text-green-700">{message}</div>}

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
              <button className="text-red-600 text-sm" onClick={remove}>Delete</button>
            </>
          )}
        </div>

        {registrations && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Registered participants ({registrations.length})</h3>
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
