"use client";

import { useEffect, useRef, useState } from "react";
import { api, uploadImage } from "../lib/api";

// Reports whether the server has image uploads configured, once per page load.
let statusCache = null;
export function useUploadsEnabled() {
  const [enabled, setEnabled] = useState(statusCache ?? false);
  useEffect(() => {
    if (statusCache !== null) return;
    api("/uploads/status").then((d) => { statusCache = !!d.enabled; setEnabled(statusCache); }).catch(() => { statusCache = false; });
  }, []);
  return enabled;
}

// A paperclip-style button. Uploads immediately and hands back the hosted URL(s).
export default function ImageAttach({ onUploaded, disabled, label = "📷 Photo", multiple = false }) {
  const enabled = useUploadsEnabled();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!enabled) return null;

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      for (const f of files) onUploaded(await uploadImage(f));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" multiple={multiple} onChange={onPick} />
      <button type="button" className="btn-secondary text-xs" disabled={disabled || busy} onClick={() => ref.current?.click()}>
        {busy ? "Uploading…" : label}
      </button>
      {error && <span className="text-xs text-crimson-500">{error}</span>}
    </span>
  );
}
