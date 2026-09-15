import jwt from "jsonwebtoken";
import { getFirebaseAdmin } from "../config/firebase.js";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    try {
      const decoded = jwt.verify(token, process.env.DEMO_JWT_SECRET);
      if (decoded?.demo) {
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: "Demo user not found" });
        if (user.status === "disabled") return res.status(403).json({ error: "Account disabled" });
        req.user = user;
        return next();
      }
    } catch (_) {
      // not a demo token, fall through to Firebase
    }

    const admin = getFirebaseAdmin();
    if (!admin) return res.status(401).json({ error: "Invalid token" });

    const decoded = await admin.auth().verifyIdToken(token);
    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
      user = await User.create({
        name: decoded.name || decoded.email?.split("@")[0] || "New User",
        email: decoded.email,
        firebaseUid: decoded.uid,
        role: "student",
      });
    }
    if (user.status === "disabled") return res.status(403).json({ error: "Account disabled" });
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
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
