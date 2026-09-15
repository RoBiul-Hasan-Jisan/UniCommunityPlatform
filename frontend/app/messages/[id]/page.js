"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { getSocket } from "../../../lib/socket";

let typingTimeout = null;

export default function ConversationPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    try {
      const d = await api(`/messages/${id}`);
      setMessages(d.messages);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, user]);

  // Real-time delivery: join this conversation's room so new messages appear
  // instantly on both ends, no polling, no refresh — like a real chat app.
  useEffect(() => {
    if (authLoading || !user) return;
    const socket = getSocket();

    function onConnect() {
      setConnected(true);
      socket.emit("join:conversation", id);
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onMessage({ conversationId, message }) {
      if (conversationId !== id) return;
      setMessages((m) => (m.some((x) => x._id === message._id) ? m : [...m, message]));
      setOtherTyping(false);
    }
    function onTyping({ conversationId, userId, isTyping }) {
      if (conversationId !== id || userId === user._id) return;
      setOtherTyping(isTyping);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessage);
    socket.on("typing", onTyping);
    if (socket.connected) onConnect();

    return () => {
      socket.emit("leave:conversation", id);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessage);
      socket.off("typing", onTyping);
    };
  }, [id, authLoading, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  function handleTyping(value) {
    setText(value);
    const socket = getSocket();
    socket.emit("typing", { conversationId: id, isTyping: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", { conversationId: id, isTyping: false });
    }, 1500);
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const outgoing = text;
    setText("");
    clearTimeout(typingTimeout);
    getSocket().emit("typing", { conversationId: id, isTyping: false });
    try {
      const { message } = await api(`/messages/${id}`, { method: "POST", body: { text: outgoing } });
      setMessages((m) => (m.some((x) => x._id === message._id) ? m : [...m, message]));
    } catch (e) {
      setError(e.message);
      setText(outgoing); // give it back so nothing's lost
    }
  }

  if (authLoading || !user) return <AppShell><div className="text-gray-400 text-sm">Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-3">
        <div />
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-brass-500" : "bg-gray-300"}`} />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>
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
          {otherTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5 bg-paper-dim text-gray-400 text-sm italic">typing…</div>
            </div>
          )}
          <div ref={bottomRef} />
          {messages.length === 0 && !otherTyping && <div className="text-gray-400 text-sm text-center mt-10">Say hello 👋</div>}
        </div>
        <form onSubmit={send} className="border-t border-gray-100 p-3 flex gap-2">
          <input className="input flex-1" placeholder="Type a message..." value={text} onChange={(e) => handleTyping(e.target.value)} />
          <button className="btn-primary" type="submit">Send</button>
        </form>
      </div>
    </AppShell>
  );
}
