"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "../../lib/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!auth) {
      setError("Firebase isn't configured yet. Use Demo Login below to explore the app instead.");
      return;
    }
    setSubmitting(true);
    try {
      const cred =
        mode === "login"
          ? await signInWithEmailAndPassword(auth, email, password)
          : await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      await loginWithToken(idToken);
      router.replace("/feed");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-brand-600">UniConnect</div>
          <p className="text-gray-500 text-sm mt-1">
            The university student & alumni community platform.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex mb-4 rounded-lg bg-gray-100 p-1 text-sm font-medium">
            <button
              className={`flex-1 py-1.5 rounded-md ${mode === "login" ? "bg-white shadow" : "text-gray-500"}`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
            <button
              className={`flex-1 py-1.5 rounded-md ${mode === "signup" ? "bg-white shadow" : "text-gray-500"}`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px bg-gray-200 flex-1" />
          OR
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <Link href="/demo" className="btn-secondary w-full flex items-center justify-center">
          Explore with a Demo Account — no signup needed
        </Link>
        <p className="text-xs text-gray-400 text-center mt-3">
          Try it instantly as a Student, Alumni, or Admin using seeded demo data.
        </p>
      </div>
    </div>
  );
}
