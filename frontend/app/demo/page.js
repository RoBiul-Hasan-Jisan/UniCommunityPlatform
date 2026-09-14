"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

const ROLE_COLORS = {
  student: "bg-blue-100 text-blue-700",
  alumni: "bg-purple-100 text-purple-700",
  admin: "bg-amber-100 text-amber-700",
};

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
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/login" className="text-sm text-brand-600">&larr; Back to login</Link>
        <h1 className="text-2xl font-bold mt-3">Explore as a demo account</h1>
        <p className="text-gray-500 mt-1 mb-6 text-sm">
          Pick any seeded account below to jump straight into the platform — no password required.
          Run <code className="bg-gray-100 px-1 rounded">npm run seed</code> in the backend first if this list is empty.
        </p>

        {error && <div className="card p-4 text-sm text-red-600 mb-4">{error}</div>}

        {groups.map((role) => {
          const users = accounts.filter((a) => a.role === role);
          if (!users.length) return null;
          return (
            <div key={role} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{role}s</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {users.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => chooseAccount(u._id, u.role)}
                    disabled={loadingId === u._id}
                    className="card p-4 text-left hover:border-brand-500 transition disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{u.name}</span>
                      <span className={`badge ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {u.department}
                      {u.currentPosition ? ` · ${u.currentPosition} at ${u.currentCompany}` : ""}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">{u.email}</div>
                    {loadingId === u._id && <div className="text-xs text-brand-600 mt-1">Logging in...</div>}
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
