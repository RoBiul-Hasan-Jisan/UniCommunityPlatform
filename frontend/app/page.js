"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else router.replace(user.role === "admin" ? "/admin" : "/feed");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-ink-800 text-paper font-serif">
      {/* Crest / emblem mark */}
      <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
        {/* soft glow */}
        <div className="absolute inset-0 rounded-full bg-brass-400/10 blur-xl" />

        {/* rotating outer ring for a subtle "loading" cue */}
        <svg
          className="absolute inset-0 h-full w-full animate-[spin_3s_linear_infinite] text-brass-400/30"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        </svg>

        {/* seal */}
        <svg
          className="relative h-14 w-14 sm:h-16 sm:w-16 text-brass-200"
          viewBox="0 0 64 64"
          fill="none"
        >
          <circle
            cx="32"
            cy="32"
            r="30"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.55"
          />
          <circle
            cx="32"
            cy="32"
            r="24.5"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.35"
          />

          {/* open book, standing in for the "directory" / shared record */}
          <path
            d="M32 22.5c-3.6-2.6-8-3.8-12-3.5v19c4 -.3 8.4.9 12 3.5 3.6-2.6 8-3.8 12-3.5v-19c-4-.3-8.4.9-12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M32 22.5v19"
            stroke="currentColor"
            strokeWidth="1.6"
          />

          {/* laurel accents */}
          <path
            d="M16 40c-1.5 3-1.8 6.2-1 9M14.5 44.3l-3.4.6M15.6 47.6l-3.1 1.4M17.2 50.5l-2.6 2.1"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M48 40c1.5 3 1.8 6.2 1 9M49.5 44.3l3.4.6M48.4 47.6l3.1 1.4M46.8 50.5l2.6 2.1"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <div className="text-[1.35rem] sm:text-[1.5rem] font-semibold tracking-[0.08em] text-paper">
          THE DIRECTORY
        </div>
        <div className="mt-1 text-[0.65rem] sm:text-xs uppercase tracking-[0.3em] text-brass-300/80">
          Alumni &amp; Student Network
        </div>
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 text-sm tracking-wide text-paper/70">
        <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-brass-300" />
        Opening the directory…
      </div>
    </div>
  );
}