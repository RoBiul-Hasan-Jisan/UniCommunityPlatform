"use client";

import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

const ACTIONS = [
  { value: "none", label: "Resolve — no further action" },
  { value: "warn", label: "Warn the author" },
  { value: "hide", label: "Hide the content" },
  { value: "disable_user", label: "Disable the author's account" },
];
const ACTION_LABEL = { none: "No action", warned: "Author warned", content_hidden: "Content hidden", user_disabled: "Account disabled" };

function ReportRow({ r, onResolve }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("none");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(status) {
    if (action === "disable_user" && status === "resolved" && !confirm("Disable this person's account? They'll be logged out and unable to sign in.")) return;
    setBusy(true);
    try { await onResolve(r._id, status, status === "resolved" ? action : "none", note); } finally { setBusy(false); }
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-gray-500 capitalize">
            {r.targetType} reported by {r.reporter?.name} · {new Date(r.createdAt).toLocaleDateString()} · <span className="capitalize font-medium">{r.status}</span>
            {r.status !== "open" && r.actionTaken && r.actionTaken !== "none" && <> · {ACTION_LABEL[r.actionTaken]}</>}
          </div>
          <div className="text-sm mt-1 break-words">{r.reason}</div>
          {r.resolutionNote && <div className="text-xs text-gray-400 mt-1">Admin note: {r.resolutionNote}</div>}
        </div>
        {r.status === "open" && (
          <button className="btn-secondary text-xs whitespace-nowrap" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "Close" : "Review"}</button>
        )}
      </div>

      {open && r.status === "open" && (
        <div className="mt-3 p-3 rounded-md bg-paper-dim space-y-2">
          <select className="input text-sm" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <input className="input text-sm" placeholder="Optional note (shown to the author when warning)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary text-xs" disabled={busy} onClick={() => submit("resolved")}>Resolve</button>
            <button className="btn-secondary text-xs" disabled={busy} onClick={() => submit("dismissed")}>Dismiss as unfounded</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [show, setShow] = useState("open");

  async function load() {
    try {
      const { reports } = await api("/admin/reports");
      setReports(reports);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function resolve(id, status, action, note) {
    try {
      await api(`/admin/reports/${id}/resolve`, { method: "POST", body: { status, action, note } });
      setError("");
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const visible = reports.filter((r) => (show === "open" ? r.status === "open" : show === "all" ? true : r.status !== "open"));
  const openCount = reports.filter((r) => r.status === "open").length;

  return (
    <AppShell>
      <h1 className="font-serif text-2xl text-ink-800 mb-1">Reports</h1>
      <p className="text-sm text-gray-500 mb-4">{openCount} open · review each report and choose an action.</p>
      <div className="flex gap-2 mb-4">
        {[["open", "Open"], ["closed", "Closed"], ["all", "All"]].map(([v, l]) => (
          <button key={v} onClick={() => setShow(v)} className={`badge border ${show === v ? "bg-ink-800 text-paper border-ink-800" : "bg-transparent text-gray-600 border-gray-300"}`}>{l}</button>
        ))}
      </div>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {visible.map((r) => <ReportRow key={r._id} r={r} onResolve={resolve} />)}
        {visible.length === 0 && <div className="p-6 text-center text-sm text-gray-400">{show === "open" ? "No open reports — all clear." : "No reports here."}</div>}
      </div>
    </AppShell>
  );
}
