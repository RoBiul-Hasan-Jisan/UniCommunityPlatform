import jwt from "jsonwebtoken";
import { getFirebaseAdmin } from "../config/firebase.js";
import User from "../models/User.js";
import { isDemoEnabled, isUniversityEmail } from "../config/env.js";

// Shared by the auth middleware and the /auth/register route so token
// verification logic lives in exactly one place.
export async function verifyFirebaseToken(idToken) {
  const admin = getFirebaseAdmin();
  if (!admin) throw new Error("Firebase is not configured on this server");
  return admin.auth().verifyIdToken(idToken);
}

// Resolves a bearer token (demo JWT or Firebase ID token) to a live User
// document. Shared by the Express middleware below AND the Socket.IO
// handshake authenticator, so the two never drift out of sync.
export async function authenticateToken(token) {
  if (!token) throw new Error("Missing auth token");

  // Only the signature check is wrapped: a failure here just means "this isn't
  // a demo token, try Firebase". Real errors (disabled account, demo mode off)
  // must NOT be swallowed by that fallback, so they're thrown outside the try.
  let demoPayload = null;
  try {
    const payload = jwt.verify(token, process.env.DEMO_JWT_SECRET);
    if (payload?.demo) demoPayload = payload;
  } catch (_) {
    // not a demo token, fall through to Firebase
  }

  if (demoPayload) {
    // Demo tokens stop working the moment demo mode is switched off.
    if (!isDemoEnabled()) throw new Error("Demo mode is disabled");
    const user = await User.findById(demoPayload.userId);
    if (!user) throw new Error("Demo user not found");
    if (user.status === "disabled") throw new Error("Account disabled");
    return user;
  }

  const decoded = await verifyFirebaseToken(token);
  let user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    // Fallback only — normal signups go through POST /api/auth/register first,
    // which lets the person pick student/alumni. Anyone who reaches here
    // without registering first (e.g. an old session) is provisioned as a
    // student. This path can NEVER create an admin account.
    user = await User.create({
      name: decoded.name || decoded.email?.split("@")[0] || "New User",
      email: decoded.email,
      firebaseUid: decoded.uid,
      role: "student",
      verified: isUniversityEmail(decoded.email),
    });
  }
  if (user.status === "disabled") throw new Error("Account disabled");
  return user;
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const user = await authenticateToken(token);
    req.user = user;
    next();
  } catch (err) {
    const status = err.message === "Account disabled" ? 403 : 401;
    return res.status(status).json({ error: err.message || "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to do this" });
    }
    next();
  };
}
