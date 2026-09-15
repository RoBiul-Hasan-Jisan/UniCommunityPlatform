"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "../../lib/AuthContext";
import { api } from "../../lib/api";

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

  async function handleSubmit(e) {
    e.preventDefault();
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
        await api("/auth/register", { body: { idToken, role, department, name } });
        const loggedInUser = await loginWithToken(idToken);
        routeByRole(loggedInUser);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Masthead panel */}
      <div className="hidden lg:flex lg:w-[44%] bg-ink-800 text-paper flex-col justify-between px-14 py-14 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full border border-brass-400/10" />
        <div className="absolute -right-10 top-40 w-64 h-64 rounded-full border border-brass-400/10" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full border border-brass-300/70 flex items-center justify-center text-brass-200 font-serif text-base">
              UC
            </span>
            <span className="text-ink-300 text-xs tracking-[0.08em]">University Community Directory</span>
          </div>
        </div>

        <div className="relative">
          <h1 className="font-serif text-5xl leading-[1.08] text-paper">
            Every class,<br />one campus record.
          </h1>
          <p className="mt-6 text-ink-200 text-[0.95rem] leading-relaxed max-w-sm">
            Find your cohort, sit in on an alumni-led workshop, and ask for
            guidance from someone who's already walked the path — all in one
            place built for this university's community.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-6 pt-8 border-t border-white/10 text-ink-200">
          <div>
            <div className="font-serif text-2xl text-brass-200">Feed</div>
            <div className="text-xs mt-1">Campus discussion</div>
          </div>
          <div>
            <div className="font-serif text-2xl text-brass-200">Workshops</div>
            <div className="text-xs mt-1">Led by alumni</div>
          </div>
          <div>
            <div className="font-serif text-2xl text-brass-200">Mentorship</div>
            <div className="text-xs mt-1">One request away</div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="font-serif text-2xl text-ink-800">UniConnect</div>
            <p className="text-gray-500 text-sm mt-1">The student & alumni community platform.</p>
          </div>

          <h2 className="font-serif text-2xl text-ink-800 mb-1 hidden lg:block">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6 hidden lg:block">Sign in to your directory account.</p>

          <div className="card p-6">
            <div className="flex mb-5 rounded-md bg-paper-dim p-1 text-sm font-medium">
              <button
                type="button"
                className={`flex-1 py-1.5 rounded transition-colors ${mode === "login" ? "bg-white shadow-card text-ink-800" : "text-gray-500"}`}
                onClick={() => { setMode("login"); setNotice(""); setPendingUser(null); setError(""); }}
              >
                Log in
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 rounded transition-colors ${mode === "signup" ? "bg-white shadow-card text-ink-800" : "text-gray-500"}`}
                onClick={() => { setMode("signup"); setNotice(""); setPendingUser(null); setError(""); }}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "login" && (
                <div>
                  <label className="text-sm font-medium text-ink-700">Log in as</label>
                  <div className="flex gap-2 mt-1">
                    {["student", "alumni", "admin"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setLoginRole(r); setNotice(""); setPendingUser(null); }}
                        className={`flex-1 py-2 rounded-md text-sm font-medium border capitalize transition-colors ${loginRole === r ? "bg-ink-800 text-paper border-ink-800" : "border-gray-300 text-gray-600"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This just picks which portal to open — your account's actual role always decides access.
                  </p>
                </div>
              )}
              {mode === "signup" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-ink-700">I am a…</label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${role === "student" ? "bg-ink-800 text-paper border-ink-800" : "border-gray-300 text-gray-600"}`}
                      >
                        Current student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("alumni")}
                        className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${role === "alumni" ? "bg-ink-800 text-paper border-ink-800" : "border-gray-300 text-gray-600"}`}
                      >
                        Alumni
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Alumni can host workshops and answer mentorship requests. Admin access is granted separately and can't be self-selected.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-ink-700">Full name</label>
                    <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-ink-700">Department</label>
                    <input className="input mt-1" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium text-ink-700">Email</label>
                <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink-700">Password</label>
                <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              {error && <div className="text-sm text-crimson-500">{error}</div>}
              {notice && (
                <div className="text-sm bg-brass-50 text-brass-700 rounded-md p-3 space-y-2">
                  <div>{notice}</div>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => { routeByRole(pendingUser); }}
                  >
                    Continue to the {pendingUser?.role} area
                  </button>
                </div>
              )}
              {!pendingUser && (
                <button className="btn-primary w-full" type="submit" disabled={submitting}>
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

          <Link href="/demo" className="btn-secondary w-full flex items-center justify-center">
            Explore with a demo account — no signup needed
          </Link>
          <p className="text-xs text-gray-400 text-center mt-3">
            Try it instantly as a Student, Alumni, or Admin using seeded demo data.
          </p>
        </div>
      </div>
    </div>
  );
}
