"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "./socket";

// Tracks which of the given user IDs are currently online. Queries the
// current snapshot once (via a socket ack), then stays live via
// presence:online/offline broadcasts for as long as the component is mounted.
export function usePresence(userIds) {
  const [online, setOnline] = useState(() => new Set());
  const idsKey = (userIds || []).filter(Boolean).join(",");

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",");
    const socket = getSocket();

    function query() {
      socket.emit("presence:query", ids, (onlineIds) => {
        setOnline(new Set(onlineIds));
      });
    }
    if (socket.connected) query();
    socket.on("connect", query);

    function onOnline({ userId }) {
      if (!ids.includes(userId)) return;
      setOnline((s) => new Set(s).add(userId));
    }
    function onOffline({ userId }) {
      setOnline((s) => {
        if (!s.has(userId)) return s;
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
    socket.on("presence:online", onOnline);
    socket.on("presence:offline", onOffline);

    return () => {
      socket.off("connect", query);
      socket.off("presence:online", onOnline);
      socket.off("presence:offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return online;
}

// A small inline dot, meant to sit on the corner of an avatar.
export function PresenceDot({ online, className = "" }) {
  return (
    <span
      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? "bg-green-500" : "bg-gray-300"} ${className}`}
      title={online ? "Online" : "Offline"}
    />
  );
}
