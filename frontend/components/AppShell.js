"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import Avatar from "./Avatar";

const STUDENT_ALUMNI_NAV = [
  { href: "/feed", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/network", label: "My Network" },
  { href: "/workshops", label: "Workshops" },
  { href: "/jobs", label: "Jobs" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/office-hours", label: "Office Hours" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/tools", label: "Tools" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/workshops", label: "Workshops" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/office-hours", label: "Office Hours" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/activity", label: "Activity Logs" },
];

// A rounded ink tile with three uneven bars (brass / paper / brass) that
// fade out on hover to reveal the actual crest underneath — same trick as
// a classic hamburger-to-logo reveal, tuned to this app's own mark.
function MenuToggle({ onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      className={`group relative flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px] overflow-hidden rounded-2xl bg-ink-800 shadow-md shadow-ink-900/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${className}`}
    >
      <span className="h-[3px] w-5 rounded-full bg-brass-400 transition-opacity duration-300 group-hover:opacity-0" />
      <span className="h-[3px] w-7 rounded-full bg-paper transition-opacity duration-300 group-hover:opacity-0" />
      <span className="h-[3px] w-6 rounded-full bg-brass-400 transition-opacity duration-300 group-hover:opacity-0" />

      <span className="absolute w-7 h-7 rounded-full bg-white p-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <img src="/logo.png" alt="" className="w-full h-full object-contain rounded-full" />
      </span>
    </button>
  );
}

export default function AppShell({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [unread, setUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    let active = true;

    api("/notifications")
      .then((d) => active && setUnread(d.unreadCount))
      .catch(() => {});

    return () => (active = false);
  }, [user, pathname]);

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
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Close mobile sidebar whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scrolling while mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

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
  const canCreateWorkshop =
    user.role === "alumni" || user.role === "admin";

  return (
    <div className="min-h-screen flex bg-paper">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky
          top-0 left-0
          z-50
          w-64
          shrink-0
          bg-ink-800
          text-paper
          flex flex-col
          h-screen
          transition-transform duration-300 ease-in-out

          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Header */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link
              href={isAdmin ? "/admin" : "/feed"}
              className="flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-full bg-white shrink-0 p-1 shadow-sm">
                <img src="/logo.png" alt="UniConnect" className="w-full h-full object-contain rounded-full" />
              </span>

              <span>
                <div className="font-serif text-lg leading-none text-paper">
                  UniConnect
                </div>

                <div className="text-[11px] text-ink-300 mt-1 tracking-wide">
                  Est. Class Directory
                </div>
              </span>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-ink-300 hover:text-paper text-2xl leading-none"
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          <div className="text-xs text-brass-300 mt-4 capitalize">
            {user.role} account
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              pathname?.startsWith(item.href + "/");

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
                  <span className="badge bg-crimson-500 text-white">
                    {unread}
                  </span>
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

        {/* User */}
        <div className="px-5 py-5 border-t border-white/10 flex items-center gap-3">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} className="w-9 h-9 text-xs bg-brass-500/20 text-brass-200" />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate text-paper">
              {user.name}
            </div>

            <div className="text-xs text-ink-300 truncate">
              {user.email}
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="px-5 pb-5">
          <button
            className="w-full text-sm text-center py-2 rounded-md border border-white/15 text-ink-200 hover:text-paper hover:border-white/30 transition-colors"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 h-16 bg-paper/95 backdrop-blur border-b border-ink-900/10 flex items-center px-4">
          <MenuToggle onClick={() => setSidebarOpen(true)} />

          <Link
            href={isAdmin ? "/admin" : "/feed"}
            className="ml-3 font-serif text-lg text-ink-800"
          >
            UniConnect
          </Link>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}