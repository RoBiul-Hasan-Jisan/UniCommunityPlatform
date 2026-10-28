"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { getSocket } from "../../../lib/socket";
import ImageAttach from "../../../components/ImageAttach";

let typingTimeout = null;

export default function ConversationPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const bottomRef = useRef(null);
  const scrollerRef = useRef(null);
  const stickToBottom = useRef(true); // don't yank the view down while reading older messages

  async function load() {
    try {
      const d = await api(`/messages/${id}`);
      setMessages(d.messages);
      setHasMore(!!d.hasMore);
      // Seed the initial "seen" state from whichever of my messages the
      // other participant has already read, before any live update arrives.
      const mineReadByOther = d.messages.filter((m) => String(m.sender) === String(user._id) && m.readBy?.some((r) => String(r) !== String(user._id)));
      if (mineReadByOther.length > 0) {
        setOtherReadAt(new Date(mineReadByOther[mineReadByOther.length - 1].createdAt));
      }
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
      // I'm looking at this thread right now, so this counts as read —
      // let the sender know without waiting for me to reopen the page.
      if (String(message.sender) !== String(user._id)) {
        api(`/messages/${id}/read`, { method: "POST" }).catch(() => {});
      }
    }
    function onTyping({ conversationId, userId, isTyping }) {
      if (conversationId !== id || userId === user._id) return;
      setOtherTyping(isTyping);
    }
    function onRead({ conversationId, readerId }) {
      if (conversationId !== id || readerId === user._id) return;
      // We don't get per-message granularity from this event — the reader
      // just opened the thread and everything up to now was marked read —
      // so "now" is an accurate enough seen-boundary for the UI.
      setOtherReadAt(new Date());
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessage);
    socket.on("typing", onTyping);
    socket.on("message:read", onRead);
    if (socket.connected) onConnect();

    return () => {
      socket.emit("leave:conversation", id);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessage);
      socket.off("typing", onTyping);
      socket.off("message:read", onRead);
    };
  }, [id, authLoading, user]);

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // Older history is loaded on demand (30 at a time) instead of all at once.
  async function loadOlder() {
    if (!messages.length || loadingOlder) return;
    setLoadingOlder(true);
    stickToBottom.current = false;
    const el = scrollerRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const d = await api(`/messages/${id}?before=${messages[0]._id}`);
      setMessages((m) => [...d.messages.filter((x) => !m.some((y) => y._id === x._id)), ...m]);
      setHasMore(!!d.hasMore);
      // Keep the message the person was reading in place after prepending.
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingOlder(false);
    }
  }

  function onScroll(e) {
    const el = e.currentTarget;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function handleTyping(value) {
    setText(value);
    const socket = getSocket();
    socket.emit("typing", { conversationId: id, isTyping: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing", { conversationId: id, isTyping: false });
    }, 1500);
  }

  async function sendAttachment(url) {
    stickToBottom.current = true;
    try {
      const { message } = await api(`/messages/${id}`, { method: "POST", body: { attachmentUrl: url } });
      setMessages((m) => (m.some((x) => x._id === message._id) ? m : [...m, message]));
    } catch (e) {
      setError(e.message);
    }
  }

  async function send(e) {
    e.preventDefault();
    stickToBottom.current = true;
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
        <div ref={scrollerRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
          {hasMore && (
            <div className="text-center">
              <button className="btn-secondary text-xs" onClick={loadOlder} disabled={loadingOlder}>
                {loadingOlder ? "Loading…" : "Load earlier messages"}
              </button>
            </div>
          )}
          {messages.map((m, i) => {
            const mine = String(m.sender) === String(user._id);
            const isLastMine = mine && !messages.slice(i + 1).some((later) => String(later.sender) === String(user._id));
            const seen = isLastMine && otherReadAt && new Date(m.createdAt) <= otherReadAt;
            return (
              <div key={m._id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className={`rounded-2xl px-4 py-2.5 max-w-md text-sm ${mine ? "bg-ink-800 text-paper" : "bg-paper-dim text-ink-800"}`}>
                  {m.attachmentUrl && (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.attachmentUrl} alt="Shared image" loading="lazy" className="rounded-lg max-h-64 object-cover" />
                    </a>
                  )}
                  {m.text && <span className="whitespace-pre-wrap break-words">{m.text}</span>}
                  <div className={`text-[10px] mt-1 ${mine ? "text-brass-200/80" : "text-gray-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                {seen && <div className="text-[10px] text-gray-400 mt-0.5 mr-1">Seen</div>}
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
          <ImageAttach label="📷" onUploaded={sendAttachment} />
          <input className="input flex-1" placeholder="Type a message..." maxLength={4000} value={text} onChange={(e) => handleTyping(e.target.value)} />
          <button className="btn-primary" type="submit">Send</button>
        </form>
      </div>
    </AppShell>
  );
}
