"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

const ICONS = {
  connection_request: "🤝",
  connection_accepted: "✅",
  message: "💬",
  workshop_registration: "📝",
  workshop_update: "🔔",
  workshop_upcoming: "⏰",
  mentorship_request: "🎓",
  mentorship_update: "🎓",
  post_comment: "💭",
  comment_reply: "💭",
  reaction: "👍",
  admin: "📢",
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const d = await api("/notifications");
      setNotifications(d.notifications);
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

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: "POST" });
      setNotifications((n) => n.map((x) => (x._id === id ? { ...x, read: true } : x)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function markAll() {
    try {
      await api("/notifications/read-all", { method: "POST" });
      setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl text-ink-800">Notifications</h1>
        <button className="btn-secondary text-sm" onClick={markAll}>Mark all as read</button>
      </div>

      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-400 text-sm">Loading…</div>}

      <div className="card divide-y">
        {notifications.map((n) => (
          <Link
            key={n._id}
            href={n.link || "#"}
            onClick={() => !n.read && markRead(n._id)}
            className={`flex items-start gap-3 p-4 hover:bg-gray-50 ${!n.read ? "bg-brand-50/40" : ""}`}
          >
            <div className="text-lg">{ICONS[n.type] || "🔔"}</div>
            <div className="flex-1">
              <div className="text-sm text-gray-800">{n.text}</div>
              <div className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-2" />}
          </Link>
        ))}
        {!loading && notifications.length === 0 && (
          <div className="p-6 text-sm text-gray-400 text-center">You're all caught up.</div>
        )}
      </div>
    </AppShell>
  );
}
