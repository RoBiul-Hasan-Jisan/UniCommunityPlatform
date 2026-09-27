"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { auth } from "./firebase";
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { connectSocket, disconnectSocket } from "./socket";

const AuthContext = createContext(null);
const AUTH_MODE_KEY = "authMode"; // "demo" | "firebase"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (token) => {
    try {
      const { user } = await api("/auth/me", { token });
      setUser(user);
      connectSocket(token); // opens the live connection for notifications, chat, feed
      return user;
    } catch (err) {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem(AUTH_MODE_KEY);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const mode = typeof window !== "undefined" ? localStorage.getItem(AUTH_MODE_KEY) : null;

    // Demo sessions are a long-lived (7-day) JWT, not a Firebase session —
    // nothing to refresh, so just use the stored token directly.
    if (mode === "demo") {
      const token = localStorage.getItem("authToken");
      if (token) loadMe(token).finally(() => setLoading(false));
      else setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    // Real accounts: never trust a token pulled from localStorage on its own
    // — Firebase ID tokens expire after 1 hour, and a token captured once at
    // login and left in storage would silently start failing every request
    // once it expired, with no obvious reason why from the user's side.
    // onIdTokenChanged fires on sign-in, sign-out, AND whenever Firebase
    // refreshes the token in the background (it does this automatically
    // while the app is open), so this keeps localStorage's copy current
    // for the entire life of the session, not just the first hour of it.
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        localStorage.setItem("authToken", idToken);
        localStorage.setItem(AUTH_MODE_KEY, "firebase");
        await loadMe(idToken);
      } else {
        setUser(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem(AUTH_MODE_KEY);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [loadMe]);

  // Returns the loaded user so callers can route by role immediately —
  // React state updates from setUser() aren't visible in the same tick.
  // `mode` records whether this is a demo session or a real Firebase one,
  // so the bootstrap effect above knows which strategy to use on refresh.
  const loginWithToken = useCallback(
    async (token, mode = "firebase") => {
      localStorage.setItem("authToken", token);
      localStorage.setItem(AUTH_MODE_KEY, mode);
      return loadMe(token);
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem(AUTH_MODE_KEY);
    setUser(null);
    disconnectSocket();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (_) {}
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
