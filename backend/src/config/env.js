// Central place for environment checks, so a misconfigured deployment fails
// loudly at startup instead of half-working (or being quietly insecure).

const isProd = () => process.env.NODE_ENV === "production";

// Demo login hands out passwordless sessions (including the admin account).
// It is ON by default in development and OFF by default in production —
// production must opt in explicitly with DEMO_MODE_ENABLED=true.
export function isDemoEnabled() {
  const v = process.env.DEMO_MODE_ENABLED;
  if (v === undefined || v === "") return !isProd();
  return String(v).toLowerCase() === "true";
}

export function validateEnv() {
  const errors = [];
  const warnings = [];

  if (!process.env.MONGODB_URI) errors.push("MONGODB_URI is not set.");

  const secret = process.env.DEMO_JWT_SECRET;
  if (!secret) {
    errors.push("DEMO_JWT_SECRET is not set.");
  } else if (secret.length < 32) {
    (isProd() ? errors : warnings).push("DEMO_JWT_SECRET should be at least 32 characters.");
  } else if (/change_this|secret|password/i.test(secret)) {
    (isProd() ? errors : warnings).push("DEMO_JWT_SECRET looks like a placeholder — generate a random one.");
  }

  if (isProd()) {
    if (!process.env.CLIENT_ORIGIN) errors.push("CLIENT_ORIGIN must be set in production.");
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      warnings.push("Firebase Admin credentials are incomplete — real sign-in will not work.");
    }
    if (isDemoEnabled()) warnings.push("DEMO_MODE_ENABLED=true in production: anyone can log in as any demo account (including admin).");
  }

  return { errors, warnings };
}

export function assertEnv(log = console) {
  const { errors, warnings } = validateEnv();
  warnings.forEach((w) => log.warn(`[env] ${w}`));
  if (errors.length) {
    errors.forEach((e) => log.error(`[env] ${e}`));
    throw new Error("Invalid environment configuration — see errors above.");
  }
}

// UNIVERSITY_EMAIL_DOMAINS="uni.edu,students.uni.edu" — anyone signing up with
// one of these domains is marked "verified" automatically.
export function isUniversityEmail(email = "") {
  const domains = (process.env.UNIVERSITY_EMAIL_DOMAINS || "")
    .split(",").map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  const domain = String(email).toLowerCase().split("@")[1] || "";
  return domains.some((d) => domain === d || domain.endsWith(`.${d}`));
}
