"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";

const STUDENT_ALUMNI_NAV = [
  { href: "/feed", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/network", label: "My Network" },
  { href: "/workshops", label: "Workshops" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/workshops", label: "Workshops" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/activity", label: "Activity Logs" },
];

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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : STUDENT_ALUMNI_NAV;
  const canCreateWorkshop = user.role === "alumni" || user.role === "admin";

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <Link href={isAdmin ? "/admin" : "/feed"} className="text-lg font-bold text-brand-600">
            UniConnect
          </Link>
          <div className="text-xs text-gray-500 mt-1 capitalize">{user.role} account</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{item.label}</span>
                {item.label === "Notifications" && unread > 0 && (
                  <span className="badge bg-red-100 text-red-700">{unread}</span>
                )}
              </Link>
            );
          })}
          {!isAdmin && canCreateWorkshop && (
            <Link
              href="/workshops/create"
              className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              + Create Workshop
            </Link>
          )}
          {!isAdmin && (
            <Link
              href={`/profile/${user._id}`}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                pathname?.startsWith("/profile") ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Profile
            </Link>
          )}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="text-sm font-semibold truncate">{user.name}</div>
          <div className="text-xs text-gray-500 truncate mb-3">{user.email}</div>
          <button className="btn-secondary w-full text-sm" onClick={() => { logout(); router.replace("/login"); }}>
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
