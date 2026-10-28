"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// "Turn on push notifications" switch. Hidden entirely when the browser or
// the server doesn't support it, so it never shows a button that can't work.
export default function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || process.env.NODE_ENV !== "production") return;
      try {
        const { enabled } = await api("/push/public-key");
        if (!enabled) return;
        setSupported(true);
        const reg = await navigator.serviceWorker.ready;
        setOn(!!(await reg.pushManager.getSubscription()));
      } catch {}
    })();
  }, []);

  if (!supported) return null;

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api("/push/unsubscribe", { method: "POST", body: { endpoint: existing.endpoint } });
        await existing.unsubscribe();
        setOn(false);
      } else {
        if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications were blocked in your browser settings.");
        const { publicKey } = await api("/push/public-key");
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
        await api("/push/subscribe", { method: "POST", body: sub.toJSON() });
        setOn(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button className="btn-secondary text-xs" onClick={toggle} disabled={busy}>
        {on ? "🔕 Turn off push notifications" : "🔔 Turn on push notifications"}
      </button>
      {error && <span className="text-xs text-crimson-500">{error}</span>}
    </div>
  );
}
