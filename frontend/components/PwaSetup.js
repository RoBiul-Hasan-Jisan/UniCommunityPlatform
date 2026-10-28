"use client";

import { useEffect } from "react";

// Registers the service worker (offline shell + web push). Renders nothing.
export default function PwaSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
