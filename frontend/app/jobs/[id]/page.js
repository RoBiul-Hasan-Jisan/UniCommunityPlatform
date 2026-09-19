"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { getSocket } from "../../../lib/socket";

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [referralNote, setReferralNote] = useState("");
  const [requestingReferral, setRequestingReferral] = useState(false);

  async function load() {
    try {
      const { job } = await api(`/jobs/${id}`);
      setJob(job);
      setSaved(job.savedBy?.some((u) => u === user?._id || u?._id === user?._id) || false);
    } catch (e) {
      setLoadError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function onUpdated(updated) {
      if (updated._id !== id) return;
      setJob(updated);
    }
    function onDeleted({ jobId }) {
      if (jobId !== id) return;
      setMessage("This job posting was removed.");
    }
    socket.on("job:updated", onUpdated);
    socket.on("job:deleted", onDeleted);
    return () => {
      socket.off("job:updated", onUpdated);
      socket.off("job:deleted", onDeleted);
    };
  }, [id, authLoading, user]);

  const isOwner = job && user && String(job.postedBy._id) === String(user._id);
  const canManage = isOwner || user?.role === "admin";
  const myReferralRequest = job?.referralRequests?.find((r) => String(r.requester._id) === String(user?._id));

  async function toggleSave() {
    setSaving(true);
    try {
      const { saved } = await api(`/jobs/${id}/save`, { method: "POST" });
      setSaved(saved);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    try {
      const { job: updated } = await api(`/jobs/${id}`, { method: "PUT", body: { status: job.status === "open" ? "closed" : "open" } });
      setJob(updated);
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function remove() {
    if (!confirm("Delete this job posting?")) return;
    try {
      await api(`/jobs/${id}`, { method: "DELETE" });
      router.push("/jobs");
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function report() {
    const reason = window.prompt("Why are you reporting this job posting?");
    if (!reason) return;
    try {
      await api("/reports", { method: "POST", body: { targetType: "job", targetId: id, reason } });
      alert("Thanks — this has been reported to admins.");
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function requestReferral(e) {
    e.preventDefault();
    setRequestingReferral(true);
    try {
      const { referralRequests } = await api(`/jobs/${id}/request-referral`, { method: "POST", body: { message: referralNote } });
      setJob((j) => ({ ...j, referralRequests }));
      setReferralNote("");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setRequestingReferral(false);
    }
  }

  async function respondToReferral(requesterId, status) {
    try {
      const { referralRequests } = await api(`/jobs/${id}/referrals/${requesterId}/respond`, { method: "POST", body: { status } });
      setJob((j) => ({ ...j, referralRequests }));
    } catch (e) {
      setMessage(e.message);
    }
  }

  if (loadError) {
    return (
      <AppShell>
        <div className="card p-6 text-sm text-crimson-500 max-w-2xl">Couldn't load this job: {loadError}</div>
      </AppShell>
    );
  }
  if (!job) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <Link href="/jobs" className="text-sm text-brass-600 hover:text-brass-700">&larr; Back to job board</Link>

      <div className="card-feature p-7 max-w-2xl mt-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h1 className="font-serif text-2xl text-ink-800">{job.title}</h1>
            <div className="text-sm text-gray-600 mt-0.5">{job.company}{job.location ? ` · ${job.location}` : ""}</div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="badge border border-brass-300 text-brass-600">{job.type}</span>
            {job.referralAvailable && <span className="badge border border-ink-300 text-ink-600">🙋 Referral available</span>}
            {job.status === "closed" && <span className="badge border border-gray-300 text-gray-500">Closed</span>}
          </div>
        </div>

        {message && <div className="mt-3 text-sm text-crimson-500">{message}</div>}

        <p className="text-ink-700 mt-4 leading-relaxed whitespace-pre-wrap">{job.description}</p>

        {job.referralAvailable && job.referralNote && (
          <div className="mt-4 bg-paper-dim rounded-lg p-3 text-sm text-gray-700">
            <span className="font-medium text-ink-700">On referrals: </span>{job.referralNote}
          </div>
        )}

        {job.requirements?.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-ink-700 mb-1.5">Requirements</div>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 mt-5 pt-5 border-t border-gray-100 text-sm">
          <div><span className="text-gray-500">Category</span><br />{job.category}</div>
          {job.salaryRange && <div><span className="text-gray-500">Salary</span><br />{job.salaryRange}</div>}
          {job.deadline && <div><span className="text-gray-500">Apply by</span><br />{new Date(job.deadline).toLocaleDateString()}</div>}
          <div><span className="text-gray-500">Posted by</span><br />{job.postedBy?.name} ({job.postedBy?.role})</div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-gray-100">
          {job.status === "open" && job.applyLink && (
            <a className="btn-primary" href={job.applyLink} target="_blank" rel="noopener noreferrer">Apply now</a>
          )}
          {job.status === "open" && job.applyEmail && !job.applyLink && (
            <a className="btn-primary" href={`mailto:${job.applyEmail}`}>Email to apply</a>
          )}
          <button className="btn-secondary" onClick={toggleSave} disabled={saving}>
            {saved ? "★ Saved" : "☆ Save"}
          </button>
          {!canManage && <button className="btn-secondary text-crimson-500" onClick={report}>Report</button>}
          {canManage && (
            <>
              <button className="btn-secondary" onClick={toggleStatus}>
                {job.status === "open" ? "Mark as closed" : "Reopen"}
              </button>
              <Link href={`/jobs/${id}/edit`} className="btn-secondary">Edit</Link>
              <button className="btn-secondary text-crimson-500" onClick={remove}>Delete</button>
            </>
          )}
        </div>

        {job.referralAvailable && !isOwner && job.status === "open" && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            {myReferralRequest ? (
              <div className="bg-paper-dim rounded-lg p-3 text-sm">
                <span className="font-medium text-ink-700">Your referral request: </span>
                <span className={`capitalize ${myReferralRequest.status === "accepted" ? "text-brass-600" : myReferralRequest.status === "declined" ? "text-crimson-500" : "text-gray-500"}`}>
                  {myReferralRequest.status}
                </span>
              </div>
            ) : (
              <form onSubmit={requestReferral}>
                <label className="text-sm font-medium text-ink-700">Request a referral</label>
                <textarea
                  className="input mt-1.5 text-sm"
                  rows={2}
                  placeholder="A line about why you're a good fit (optional)"
                  value={referralNote}
                  onChange={(e) => setReferralNote(e.target.value)}
                />
                <button className="btn-primary text-sm mt-2" type="submit" disabled={requestingReferral}>
                  {requestingReferral ? "Sending…" : "Request referral"}
                </button>
              </form>
            )}
          </div>
        )}

        {canManage && job.referralAvailable && job.referralRequests?.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="text-sm font-medium text-ink-700 mb-2">Referral requests ({job.referralRequests.length})</div>
            <div className="space-y-2">
              {job.referralRequests.map((r) => (
                <div key={r.requester._id} className="bg-paper-dim rounded-lg p-3 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-ink-800">{r.requester.name} <span className="text-gray-400 font-normal capitalize">· {r.requester.role}</span></div>
                    {r.message && <div className="text-gray-600 mt-0.5">{r.message}</div>}
                  </div>
                  {r.status === "pending" ? (
                    <div className="flex gap-1.5 shrink-0">
                      <button className="btn-secondary text-xs" onClick={() => respondToReferral(r.requester._id, "accepted")}>Accept</button>
                      <button className="btn-secondary text-xs text-crimson-500" onClick={() => respondToReferral(r.requester._id, "declined")}>Decline</button>
                    </div>
                  ) : (
                    <span className={`badge shrink-0 ${r.status === "accepted" ? "bg-brass-50 text-brass-700 border border-brass-300" : "bg-gray-100 text-gray-500"}`}>{r.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
