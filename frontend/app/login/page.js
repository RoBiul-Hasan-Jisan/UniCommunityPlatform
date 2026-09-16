"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "../../lib/AuthContext";
import { api } from "../../lib/api";

const ROLE_META = {
  student: {
    label: "Current student",
    hint: "Join the feed, register for workshops, ask for mentorship.",
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M2 8.5 12 4l10 4.5-10 4.5L2 8.5Z" strokeLinejoin="round" />
        <path d="M6 10.6v4.9c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-4.9" strokeLinejoin="round" />
        <path d="M21 8.5v6" strokeLinecap="round" />
      </svg>
    ),
  },
  alumni: {
    label: "Alumni",
    hint: "Host workshops, mentor students, share what you've learned.",
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="7.5" width="18" height="12" rx="1.5" />
        <path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" />
        <path d="M3 12.5c2.8 1.4 5.7 2.1 9 2.1s6.2-.7 9-2.1" />
      </svg>
    ),
  },
  admin: {
    label: "Admin",
    hint: "Manage users, workshops, posts, and reports.",
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3 4.5 5.8v5.6c0 4.4 3 8.2 7.5 9.6 4.5-1.4 7.5-5.2 7.5-9.6V5.8L12 3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

function MailIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="1.5" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" strokeLinecap="round" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="3.5" width="14" height="17" rx="1" />
      <path d="M9 8h1.2M13.8 8H15M9 11.5h1.2M13.8 11.5H15M9 15h1.2M13.8 15H15" strokeLinecap="round" />
    </svg>
  );
}

function Field({ icon, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
      <input className="input pl-9" {...props} />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [loginRole, setLoginRole] = useState("student"); // which portal tab they're entering through
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student"); // role chosen at signup
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function routeByRole(loggedInUser) {
    router.replace(loggedInUser?.role === "admin" ? "/admin" : "/feed");
  }

  function switchMode(next) {
    setMode(next);
    setNotice("");
    setPendingUser(null);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return; // guards against a double-click/double-submit firing this twice
    setError("");
    setNotice("");
    setPendingUser(null);
    if (!auth) {
      setError("Firebase isn't configured yet. Use Demo Login below to explore the app instead.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        const loggedInUser = await loginWithToken(idToken);
        // The tab picked above is just for orientation — the account's real
        // role always comes from the server and decides where you land.
        // If they don't match, pause and say so instead of silently
        // redirecting somewhere the person didn't expect.
        if (loggedInUser && loggedInUser.role !== loginRole) {
          setNotice(`This account is registered as ${loggedInUser.role}, not ${loginRole}.`);
          setPendingUser(loggedInUser);
        } else {
          routeByRole(loggedInUser);
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        // Register first so the account is created with the chosen role
        // (student/alumni only — the server never accepts "admin" here).
        await api("/auth/register", { method: "POST", body: { idToken, role, department, name } });
        const loggedInUser = await loginWithToken(idToken);
        routeByRole(loggedInUser);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  const activeRole = mode === "login" ? loginRole : role;

  return (
    <div className="min-h-screen bg-paper relative overflow-hidden flex items-center justify-center px-4 py-12">
      {/* soft ambient background texture — a couple of faint brass rings, nothing loud */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full border border-brass-200/60" />
        <div className="absolute -bottom-40 -right-24 w-[24rem] h-[24rem] rounded-full border border-ink-100" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-brass-100/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Wordmark */}
        <div className="flex flex-col items-center text-center mb-7">
          <span className="w-12 h-12 rounded-full bg-ink-800 border border-brass-300/60 flex items-center justify-center text-brass-200 font-serif text-lg">
            UC
          </span>
          <div className="font-serif text-2xl text-ink-800 mt-3">UniConnect</div>
          <p className="text-gray-500 text-sm mt-1">The student &amp; alumni community directory.</p>
        </div>

        <div className="card-feature p-7">
          {/* Mode switch */}
          <div className="flex mb-6 rounded-md bg-paper-dim p-1 text-sm font-medium">
            <button
              type="button"
              className={`flex-1 py-1.5 rounded transition-colors ${mode === "login" ? "bg-white shadow-card text-ink-800" : "text-gray-500"}`}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 rounded transition-colors ${mode === "signup" ? "bg-white shadow-card text-ink-800" : "text-gray-500"}`}
              onClick={() => switchMode("signup")}
            >
              Sign up
            </button>
          </div>

          {/* Role picker — icon cards */}
          <div className="mb-5">
            <div className="text-sm font-medium text-ink-700 mb-2">
              {mode === "login" ? "Log in as" : "I am a…"}
            </div>
            <div className={`grid gap-2 ${mode === "login" ? "grid-cols-3" : "grid-cols-2"}`}>
              {(mode === "login" ? ["student", "alumni", "admin"] : ["student", "alumni"]).map((r) => {
                const meta = ROLE_META[r];
                const active = activeRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (mode === "login") { setLoginRole(r); setNotice(""); setPendingUser(null); }
                      else setRole(r);
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 transition-colors ${
                      active ? "border-brass-400 bg-brass-50 text-ink-800" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {meta.icon(`w-5 h-5 ${active ? "text-brass-600" : "text-gray-400"}`)}
                    <span className="text-xs font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              {mode === "login"
                ? "This just picks which portal to open — your account's actual role always decides access."
                : "Admin access is granted separately and can't be self-selected here."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Field icon={<UserIcon />} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                <Field icon={<BuildingIcon />} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department (e.g. Computer Science)" />
              </>
            )}
            <Field icon={<MailIcon />} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
            <Field icon={<LockIcon />} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />

            {error && <div className="text-sm text-crimson-500">{error}</div>}
            {notice && (
              <div className="text-sm bg-brass-50 text-brass-700 rounded-md p-3 space-y-2">
                <div>{notice}</div>
                <button type="button" className="btn-secondary text-xs" onClick={() => routeByRole(pendingUser)}>
                  Continue to the {pendingUser?.role} area
                </button>
              </div>
            )}
            {!pendingUser && (
              <button className="btn-primary w-full mt-1" type="submit" disabled={submitting}>
                {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </button>
            )}
          </form>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px bg-gray-200 flex-1" />
          OR
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <Link href="/demo" className="card card-interactive p-4 flex items-center gap-3 no-underline">
          <span className="w-9 h-9 rounded-full bg-ink-800 flex items-center justify-center text-brass-200 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>
            <div className="text-sm font-medium text-ink-800">Explore with a demo account</div>
            <div className="text-xs text-gray-500">No signup needed — try it as a Student, Alumni, or Admin.</div>
          </span>
        </Link>
      </div>
    </div>
  );
}
