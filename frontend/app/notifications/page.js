"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";

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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await api("/notifications");
      setNotifications(d.notifications);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id) {
    await api(`/notifications/${id}/read`, { method: "POST" });
    setNotifications((n) => n.map((x) => (x._id === id ? { ...x, read: true } : x)));
  }

  async function markAll() {
    await api("/notifications/read-all", { method: "POST" });
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Notifications</h1>
        <button className="btn-secondary text-sm" onClick={markAll}>Mark all as read</button>
      </div>

      {loading && <div className="text-gray-400 text-sm">Loading...</div>}

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
