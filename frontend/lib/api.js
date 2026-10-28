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

// Upload an image (multipart). Returns the hosted https URL.
// kind: "post" | "avatar" — only decides which folder it lands in.
export async function uploadImage(file, kind = "post") {
  const form = new FormData();
  form.append("image", file);
  const doFetch = (token) =>
    fetch(`${API_BASE}/uploads/image?kind=${kind}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form, // the browser sets the multipart boundary itself
    });
  let res = await doFetch(getToken());
  if (res.status === 401) {
    const fresh = await getForceRefreshedToken();
    if (fresh) res = await doFetch(fresh);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data.url;
}

// Download a file from an authenticated endpoint (e.g. the admin CSV exports).
// A plain <a href> can't send the Authorization header, so fetch it as a blob.
export async function downloadFile(path, filename) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
