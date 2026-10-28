"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "../../lib/AuthContext";
import { api } from "../../lib/api";

const ROLE_META = {
  student: {
    label: "Current student",
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
    icon: (cls) => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3 4.5 5.8v5.6c0 4.4 3 8.2 7.5 9.6 4.5-1.4 7.5-5.2 7.5-9.6V5.8L12 3Z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

function CheckBadge() {
  return (
    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brass-500 flex items-center justify-center shadow-sm ring-2 ring-white">
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
function MailIcon() {
  return (
    <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" strokeLinecap="round" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M9 8h1.2M13.8 8H15M9 11.5h1.2M13.8 11.5H15M9 15h1.2M13.8 15H15" strokeLinecap="round" />
    </svg>
  );
}
function ArrowIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Field({ icon, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>
      <input
        className="w-full pl-10 pr-3.5 py-2.5 rounded-[10px] border border-gray-200 bg-gray-50/60 text-[0.925rem] text-ink-800 placeholder:text-gray-400 transition-all duration-150 focus:outline-none focus:bg-white focus:border-brass-400 focus:ring-4 focus:ring-brass-400/10"
        {...props}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [loginRole, setLoginRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(true); // optimistic until the server says otherwise

  useEffect(() => {
    api("/auth/config").then((c) => setDemoEnabled(!!c.demoEnabled)).catch(() => {});
  }, []);

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
    if (submitting) return;
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
        if (loggedInUser && loggedInUser.role !== loginRole) {
          setNotice(`This account is registered as ${loggedInUser.role}, not ${loginRole}.`);
          setPendingUser(loggedInUser);
        } else {
          routeByRole(loggedInUser);
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
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
      {/* ambient backdrop — a quiet radial wash, not a pattern that competes with the card */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(171,129,46,0.09),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_100%,rgba(18,25,43,0.05),transparent)]" />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Wordmark */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brass-400/25 blur-xl scale-125" />
            <span className="relative w-14 h-14 rounded-full bg-white p-1.5 shadow-[0_4px_14px_rgba(18,25,43,0.25)] flex items-center justify-center">
              <img src="/logo.png" alt="UniConnect" className="w-full h-full object-contain rounded-full" />
            </span>
          </div>
          <div className="font-serif text-[1.7rem] tracking-[-0.015em] text-ink-800 mt-4">UniConnect</div>
          <p className="text-gray-500 text-[0.875rem] mt-1">The student &amp; alumni community directory</p>
        </div>

        {/* Card — deliberately more elevation than the rest of the app: this is the front door */}
        <div className="rounded-2xl bg-white border border-gray-200/80 shadow-[0_1px_1px_rgba(18,25,43,0.03),0_20px_45px_-18px_rgba(18,25,43,0.22)] p-7">
          <div className="flex mb-6 rounded-[10px] bg-gray-100/80 p-1 text-sm font-medium">
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-[8px] transition-all duration-150 ${mode === "login" ? "bg-white shadow-[0_1px_3px_rgba(18,25,43,0.12)] text-ink-800" : "text-gray-500"}`}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 rounded-[8px] transition-all duration-150 ${mode === "signup" ? "bg-white shadow-[0_1px_3px_rgba(18,25,43,0.12)] text-ink-800" : "text-gray-500"}`}
              onClick={() => switchMode("signup")}
            >
              Sign up
            </button>
          </div>

          <div className="mb-5">
            <div className="text-[0.8rem] font-medium text-ink-700 mb-2.5">
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
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition-all duration-150 ${
                      active
                        ? "border-brass-400 bg-brass-50/70 text-ink-800 shadow-[0_2px_10px_rgba(171,129,46,0.18)] -translate-y-px"
                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {active && <CheckBadge />}
                    {meta.icon(`w-5 h-5 ${active ? "text-brass-600" : "text-gray-400"}`)}
                    <span className="text-[0.78rem] font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[0.75rem] text-gray-400 mt-2.5 leading-relaxed">
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

            {error && <div className="text-[0.825rem] text-crimson-500">{error}</div>}
            {notice && (
              <div className="text-[0.825rem] bg-brass-50 text-brass-700 rounded-xl p-3.5 space-y-2">
                <div>{notice}</div>
                <button type="button" className="btn-secondary text-xs" onClick={() => routeByRole(pendingUser)}>
                  Continue to the {pendingUser?.role} area
                </button>
              </div>
            )}
            {!pendingUser && (
              <button
                className="w-full mt-1 py-2.5 rounded-[10px] text-[0.9rem] font-semibold text-white bg-gradient-to-b from-[#C0973A] to-[#9C7526] shadow-[0_1px_2px_rgba(18,25,43,0.1),0_6px_16px_-4px_rgba(171,129,46,0.45)] transition-all duration-150 hover:shadow-[0_1px_2px_rgba(18,25,43,0.1),0_10px_22px_-4px_rgba(171,129,46,0.55)] hover:-translate-y-px active:translate-y-0 active:shadow-[0_1px_2px_rgba(18,25,43,0.1)] disabled:opacity-50 disabled:pointer-events-none"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </button>
            )}
          </form>
        </div>

        {demoEnabled && (
          <>
        <div className="my-5 flex items-center gap-3 text-[0.7rem] font-medium text-gray-400">
          <div className="h-px bg-gray-200 flex-1" />
          OR
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <Link
          href="/demo"
          className="group block rounded-2xl bg-white border border-gray-200/80 p-4 shadow-[0_1px_1px_rgba(18,25,43,0.03),0_10px_28px_-16px_rgba(18,25,43,0.18)] transition-all duration-150 hover:shadow-[0_1px_1px_rgba(18,25,43,0.03),0_16px_34px_-14px_rgba(18,25,43,0.24)] hover:-translate-y-px no-underline"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gradient-to-b from-ink-700 to-ink-800 flex items-center justify-center text-brass-200 shrink-0">
              <ArrowIcon className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
            <span>
              <div className="text-[0.875rem] font-medium text-ink-800">Explore with a demo account</div>
              <div className="text-[0.78rem] text-gray-500">No signup needed — try it as a Student, Alumni, or Admin</div>
            </span>
          </div>
        </Link>
          </>
        )}
      </div>
    </div>
  );
}
