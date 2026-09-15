"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function ConversationPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  async function load() {
    try {
      const d = await api(`/messages/${id}`);
      setMessages(d.messages);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    let interval;
    load().then((ok) => {
      if (cancelled || !ok) return;
      // simple polling instead of websockets — stop if a call ever fails
      // (e.g. session expired) instead of retrying forever
      interval = setInterval(async () => {
        const stillOk = await load();
        if (!stillOk && interval) clearInterval(interval);
      }, 4000);
    });
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const { message } = await api(`/messages/${id}`, { method: "POST", body: { text } });
      setMessages((m) => [...m, message]);
      setText("");
    } catch (e) {
      setError(e.message);
    }
  }

  if (authLoading || !user) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      {error && <div className="card p-4 text-sm text-crimson-500 mb-4">{error}</div>}
      <div className="card flex flex-col h-[75vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => {
            const mine = String(m.sender) === String(user._id);
            return (
              <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`rounded-2xl px-4 py-2.5 max-w-md text-sm ${mine ? "bg-ink-800 text-paper" : "bg-paper-dim text-ink-800"}`}>
                  {m.text}
                  <div className={`text-[10px] mt-1 ${mine ? "text-brass-200/80" : "text-gray-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
          {messages.length === 0 && <div className="text-gray-400 text-sm text-center mt-10">Say hello 👋</div>}
        </div>
        <form onSubmit={send} className="border-t border-gray-100 p-3 flex gap-2">
          <input className="input flex-1" placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" type="submit">Send</button>
        </form>
      </div>
    </AppShell>
  );
}
