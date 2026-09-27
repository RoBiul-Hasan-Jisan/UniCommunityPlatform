const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

// Only relevant for real (Firebase) sessions — demo tokens are long-lived
// JWTs with nothing to refresh. Lazily imported so this file has no
// dependency on Firebase for requests that never need it.
async function getForceRefreshedToken() {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("authMode") !== "firebase") return null;
  try {
    const { auth } = await import("./firebase");
    if (!auth?.currentUser) return null;
    const fresh = await auth.currentUser.getIdToken(true);
    localStorage.setItem("authToken", fresh);
    return fresh;
  } catch {
    return null;
  }
}

export async function api(path, { method = "GET", body, token, _retried } = {}) {
  const authToken = token || getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The background refresh in AuthContext should normally prevent this,
    // but if a request was already in flight the instant a token expired,
    // this is the safety net — force a fresh token and retry exactly once
    // rather than surfacing a confusing "invalid token" error for something
    // the person did nothing wrong to cause.
    if (res.status === 401 && !_retried) {
      const fresh = await getForceRefreshedToken();
      if (fresh) return api(path, { method, body, token: fresh, _retried: true });
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
