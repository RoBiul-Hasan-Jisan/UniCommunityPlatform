"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

const STUDENT_ALUMNI_NAV = [
  { href: "/feed", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/network", label: "My Network" },
  { href: "/workshops", label: "Workshops" },
  { href: "/jobs", label: "Jobs" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/workshops", label: "Workshops" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/activity", label: "Activity Logs" },
];

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function AppShell({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api("/notifications")
      .then((d) => active && setUnread(d.unreadCount))
      .catch(() => {});
    return () => (active = false);
  }, [user, pathname]);

  // Live badge updates — a new notification bumps the count instantly instead
  // of waiting for the next page navigation to refetch it.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    function onNotification() {
      setUnread((n) => n + 1);
    }
    socket.on("notification:new", onNotification);
    return () => socket.off("notification:new", onNotification);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink-400 font-serif text-lg">
        Opening the directory…
      </div>
    );
  }
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : STUDENT_ALUMNI_NAV;
  const canCreateWorkshop = user.role === "alumni" || user.role === "admin";

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-64 shrink-0 bg-ink-800 text-paper flex flex-col sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <Link href={isAdmin ? "/admin" : "/feed"} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full border border-brass-300/60 flex items-center justify-center text-brass-200 font-serif text-sm">
              UC
            </span>
            <span>
              <div className="font-serif text-lg leading-none text-paper">UniConnect</div>
              <div className="text-[11px] text-ink-300 mt-1 tracking-wide">Est. Class Directory</div>
            </span>
          </Link>
          <div className="text-xs text-brass-300 mt-4 capitalize">{user.role} account</div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 text-sm border-l-2 transition-colors ${
                  active
                    ? "border-brass-400 bg-white/[0.06] text-paper font-medium"
                    : "border-transparent text-ink-200 hover:text-paper hover:bg-white/[0.04]"
                }`}
              >
                <span>{item.label}</span>
                {item.label === "Notifications" && unread > 0 && (
                  <span className="badge bg-crimson-500 text-white">{unread}</span>
                )}
              </Link>
            );
          })}

          {!isAdmin && (
            <div className="pt-3 mt-3 border-t border-white/10 space-y-0.5">
              {canCreateWorkshop && (
                <Link
                  href="/workshops/create"
                  className="flex items-center px-3.5 py-2.5 text-sm border-l-2 border-transparent text-brass-300 hover:text-brass-200 hover:bg-white/[0.04]"
                >
                  + Create Workshop
                </Link>
              )}
              <Link
                href={`/profile/${user._id}`}
                className={`flex items-center px-3.5 py-2.5 text-sm border-l-2 transition-colors ${
                  pathname?.startsWith("/profile")
                    ? "border-brass-400 bg-white/[0.06] text-paper font-medium"
                    : "border-transparent text-ink-200 hover:text-paper hover:bg-white/[0.04]"
                }`}
              >
                Profile
              </Link>
            </div>
          )}
        </nav>

        <div className="px-5 py-5 border-t border-white/10 flex items-center gap-3">
          <span className="avatar w-9 h-9 text-xs bg-brass-500/20 text-brass-200">{initials(user.name)}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate text-paper">{user.name}</div>
            <div className="text-xs text-ink-300 truncate">{user.email}</div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button
            className="w-full text-sm text-center py-2 rounded-md border border-white/15 text-ink-200 hover:text-paper hover:border-white/30 transition-colors"
            onClick={() => { logout(); router.replace("/login"); }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-10 sm:px-10">{children}</div>
      </main>
    </div>
  );
}
