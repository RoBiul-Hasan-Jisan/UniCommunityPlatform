"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

const ROLE_META = {
  admin: { label: "Administrators", tag: "border-crimson-400 text-crimson-500", blurb: "Full console access — users, workshops, posts, reports." },
  alumni: { label: "Alumni", tag: "border-brass-300 text-brass-600", blurb: "Host workshops, mentor students, share what you've learned." },
  student: { label: "Students", tag: "border-ink-300 text-ink-500", blurb: "Join the feed, register for workshops, request guidance." },
};

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function DemoPage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    api("/auth/demo-accounts")
      .then((d) => setAccounts(d.users))
      .catch((e) => setError(e.message));
  }, []);

  async function chooseAccount(userId, role) {
    setLoadingId(userId);
    setError("");
    try {
      const { token } = await api("/auth/demo-login", { method: "POST", body: { userId } });
      await loginWithToken(token);
      router.replace(role === "admin" ? "/admin" : "/feed");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  }

  const groups = ["admin", "alumni", "student"];

  return (
    <div className="min-h-screen bg-paper px-4 py-14">
      <div className="max-w-3xl mx-auto">
        <Link href="/login" className="text-sm text-brass-600 hover:text-brass-700">&larr; Back to login</Link>

        <div className="mt-4 mb-10">
          <h1 className="font-serif text-3xl text-ink-800">The demo directory</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-lg leading-relaxed">
            Pick any seeded listing below to step directly into the platform in
            that role — no password required. Empty list? Run{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-ink-700">npm run seed</code> in the backend first.
          </p>
        </div>

        {error && <div className="card p-4 text-sm text-crimson-500 mb-6">{error}</div>}

        {groups.map((role) => {
          const users = accounts.filter((a) => a.role === role);
          if (!users.length) return null;
          const meta = ROLE_META[role];
          return (
            <div key={role} className="mb-9">
              <div className="flex items-baseline justify-between border-b border-gray-200 pb-2 mb-3">
                <h2 className="font-serif text-lg text-ink-800">{meta.label}</h2>
                <span className="text-xs text-gray-400">{meta.blurb}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {users.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => chooseAccount(u._id, u.role)}
                    disabled={loadingId === u._id}
                    className="card card-interactive p-4 text-left disabled:opacity-50 flex items-start gap-3"
                  >
                    <span className="avatar w-10 h-10 text-sm mt-0.5">{initials(u.name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink-800 truncate">{u.name}</span>
                        <span className={`badge border bg-transparent shrink-0 ${meta.tag}`}>{u.role}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5 truncate">
                        {u.department}
                        {u.currentPosition ? ` · ${u.currentPosition} at ${u.currentCompany}` : ""}
                      </div>
                      {loadingId === u._id && <div className="text-xs text-brass-600 mt-1">Logging in…</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {!error && accounts.length === 0 && (
          <div className="card p-6 text-sm text-gray-500">No demo accounts found yet — seed the database first.</div>
        )}
      </div>
    </div>
  );
}
