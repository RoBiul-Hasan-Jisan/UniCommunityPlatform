"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { getSocket } from "../../lib/socket";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState("");

  function load() {
    return api("/messages")
      .then((d) => setConversations(d.conversations))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // A message arriving for any conversation (from a thread not currently
  // open) bumps it to the top of the inbox live, the way Facebook Messenger does.
  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();
    function bump({ conversationId, lastMessageAt }) {
      setConversations((cs) => {
        const exists = cs.some((c) => c._id === conversationId);
        if (!exists) {
          load();
          return cs;
        }
        return [...cs]
          .map((c) => (c._id === conversationId ? { ...c, lastMessageAt: lastMessageAt || new Date().toISOString() } : c))
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    }
    socket.on("conversation:update", bump);
    return () => socket.off("conversation:update", bump);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  function otherParticipant(convo) {
    return convo.participants.find((p) => String(p._id) !== String(user._id)) || convo.participants[0];
  }

  return (
    <AppShell>
      <div className="mb-6"><h1 className="font-serif text-2xl text-ink-800">Messages</h1><p className="text-sm text-gray-500 mt-1">Private conversations with your connections.</p></div>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card divide-y">
        {conversations.map((c) => {
          const other = otherParticipant(c);
          return (
            <Link key={c._id} href={`/messages/${c._id}`} className="flex items-center gap-3 p-4 hover:bg-paper-dim/60 transition-colors">
              <span className="avatar w-9 h-9 text-xs">{(other?.name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-800 truncate">{other?.name}</div>
                <div className="text-xs text-gray-500 capitalize">{other?.role}</div>
              </div>
              <div className="text-xs text-gray-400 shrink-0">{new Date(c.lastMessageAt).toLocaleString()}</div>
            </Link>
          );
        })}
        {conversations.length === 0 && (
          <div className="p-6 text-sm text-gray-400 text-center">
            No conversations yet — connect with someone in Discover, then message them from My Network.
          </div>
        )}
      </div>
    </AppShell>
  );
}
