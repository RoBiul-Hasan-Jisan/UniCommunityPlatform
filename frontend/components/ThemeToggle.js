"use client";

import { useEffect, useState } from "react";
import { useT } from "../lib/i18n";

// The initial class is set by an inline script in layout.js (before first
// paint, so there's no light-mode flash). This just flips and remembers it.
export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(false);
  const { t } = useT();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <button onClick={toggle} className={className} aria-pressed={dark} title={dark ? t("theme.light") : t("theme.dark")}>
      {dark ? "☀ " : "☾ "}{dark ? t("theme.light") : t("theme.dark")}
    </button>
  );
}
