"use client";

import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

export default function MentorshipPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [alumniList, setAlumniList] = useState([]);
  const [form, setForm] = useState({ alumniId: "", topic: "", message: "" });
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState({});

  async function load() {
    try {
      const { requests } = await api("/mentorship");
      setRequests(requests);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    if (user?.role === "student") {
      api("/users?role=alumni")
        .then((d) => setAlumniList(d.users))
        .catch((e) => setError(e.message));
    }
  }, [user, authLoading]);

  async function submitRequest(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/mentorship", { method: "POST", body: form });
      setForm({ alumniId: "", topic: "", message: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function respond(id, status) {
    try {
      await api(`/mentorship/${id}/respond`, { method: "POST", body: { status } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function reply(id) {
    const text = replyText[id];
    if (!text?.trim()) return;
    try {
      await api(`/mentorship/${id}/respond`, { method: "POST", body: { text } });
      setReplyText((r) => ({ ...r, [id]: "" }));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (authLoading || !user) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="mb-6"><h1 className="font-serif text-2xl text-ink-800">Mentorship & guidance</h1><p className="text-sm text-gray-500 mt-1">Ask a graduate for direction, or answer a request from a student.</p></div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}

      {user?.role === "student" && (
        <form onSubmit={submitRequest} className="card p-4 mb-6 space-y-3">
          <div className="text-sm font-medium text-gray-500">Request Guidance</div>
          <select className="input" required value={form.alumniId} onChange={(e) => setForm({ ...form, alumniId: e.target.value })}>
            <option value="">Select an alumni</option>
            {alumniList.map((a) => (
              <option key={a._id} value={a._id}>{a.name} — {a.currentPosition} at {a.currentCompany}</option>
            ))}
          </select>
          <input className="input" placeholder="Topic (e.g. AI / Machine Learning)" required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <textarea className="input" rows={3} placeholder="Your message..." required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          {error && <div className="text-sm text-crimson-500">{error}</div>}
          <button className="btn-primary" type="submit">Send Request</button>
        </form>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r._id} className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-ink-800">{r.topic}</div>
                <div className="text-xs text-gray-500">
                  {user.role === "alumni" ? `From ${r.student?.name}` : `To ${r.alumni?.name}`}
                </div>
              </div>
              <span className="badge bg-gray-100 text-gray-600 capitalize">{r.status}</span>
            </div>
            <p className="text-sm text-gray-700 mt-2">{r.message}</p>

            {r.responses?.length > 0 && (
              <div className="mt-3 space-y-1 border-t pt-2">
                {r.responses.map((resp, i) => (
                  <div key={i} className="text-sm text-gray-600"><span className="font-medium">Reply:</span> {resp.text}</div>
                ))}
              </div>
            )}

            {user.role === "alumni" && r.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button className="btn-primary text-xs" onClick={() => respond(r._id, "accepted")}>Accept</button>
                <button className="btn-secondary text-xs" onClick={() => respond(r._id, "rejected")}>Reject</button>
              </div>
            )}

            {r.status === "accepted" && (
              <div className="flex gap-2 mt-3">
                <input
                  className="input text-sm flex-1"
                  placeholder="Write a reply..."
                  value={replyText[r._id] || ""}
                  onChange={(e) => setReplyText((rt) => ({ ...rt, [r._id]: e.target.value }))}
                />
                <button className="btn-secondary text-sm" onClick={() => reply(r._id)}>Send</button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <div className="text-gray-400 text-sm">No mentorship activity yet.</div>}
      </div>
    </AppShell>
  );
}
