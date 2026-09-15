"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { connectSocket, disconnectSocket } from "./socket";

const AuthContext = createContext(null);

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
      if (typeof window !== "undefined") localStorage.removeItem("authToken");
      return null;
    }
  }, []);

  useEffect(() => {
    const existingToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    if (existingToken) {
      loadMe(existingToken).finally(() => setLoading(false));
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        localStorage.setItem("authToken", idToken);
        await loadMe(idToken);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [loadMe]);

  // Returns the loaded user so callers can route by role immediately —
  // React state updates from setUser() aren't visible in the same tick.
  const loginWithToken = useCallback(
    async (token) => {
      localStorage.setItem("authToken", token);
      return loadMe(token);
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem("authToken");
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
