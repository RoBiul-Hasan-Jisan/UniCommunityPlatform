"use client";

import { useRef, useState } from "react";
import Avatar from "./Avatar";

const MAX_DIMENSION = 240; // px — plenty for a circular avatar anywhere in the app
const JPEG_QUALITY = 0.82;

function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AvatarUpload({ name, avatarUrl, onChange, size = "w-20 h-20 text-2xl" }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > 8 * 1024 * 1024) return setError("Please choose an image under 8MB.");
    setError("");
    setBusy(true);
    try {
      const dataUrl = await resizeToDataUrl(file);
      onChange(dataUrl);
    } catch {
      setError("Couldn't process that image — try a different one.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar name={name} avatarUrl={avatarUrl} className={size} />
        {busy && <div className="absolute inset-0 rounded-full bg-white/60 flex items-center justify-center text-[10px] text-ink-700">…</div>}
      </div>
      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button type="button" className="btn-secondary text-xs" onClick={() => fileRef.current?.click()} disabled={busy}>
          {avatarUrl ? "Change photo" : "Add photo"}
        </button>
        {avatarUrl && (
          <button type="button" className="text-xs text-gray-400 hover:text-crimson-500 ml-2" onClick={() => onChange("")}>
            Remove
          </button>
        )}
        {error && <div className="text-xs text-crimson-500 mt-1">{error}</div>}
      </div>
    </div>
  );
}
