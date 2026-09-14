"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    api("/messages").then((d) => setConversations(d.conversations));
  }, []);

  function otherParticipant(convo) {
    return convo.participants.find((p) => String(p._id) !== String(user._id)) || convo.participants[0];
  }

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Messages</h1>
      <div className="card divide-y">
        {conversations.map((c) => {
          const other = otherParticipant(c);
          return (
            <Link key={c._id} href={`/messages/${c._id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div>
                <div className="font-medium">{other?.name}</div>
                <div className="text-xs text-gray-500 capitalize">{other?.role}</div>
              </div>
              <div className="text-xs text-gray-400">{new Date(c.lastMessageAt).toLocaleString()}</div>
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
