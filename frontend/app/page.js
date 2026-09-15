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
    <div className="min-h-screen flex items-center justify-center bg-ink-800 text-paper font-serif text-lg tracking-wide">
      Opening the directory…
    </div>
  );
}
