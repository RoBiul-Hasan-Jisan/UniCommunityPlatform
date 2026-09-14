"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

export default function ConversationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  async function load() {
    const d = await api(`/messages/${id}`);
    setMessages(d.messages);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000); // simple polling instead of websockets
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const { message } = await api(`/messages/${id}`, { method: "POST", body: { text } });
    setMessages((m) => [...m, message]);
    setText("");
  }

  return (
    <AppShell>
      <div className="card flex flex-col h-[75vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => {
            const mine = String(m.sender) === String(user._id);
            return (
              <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`rounded-2xl px-4 py-2 max-w-md text-sm ${mine ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-800"}`}>
                  {m.text}
                  <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-gray-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
          {messages.length === 0 && <div className="text-gray-400 text-sm text-center mt-10">Say hello 👋</div>}
        </div>
        <form onSubmit={send} className="border-t p-3 flex gap-2">
          <input className="input flex-1" placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" type="submit">Send</button>
        </form>
      </div>
    </AppShell>
  );
}
