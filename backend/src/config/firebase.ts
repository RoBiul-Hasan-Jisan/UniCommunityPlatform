import admin from "firebase-admin";

let initialized = false;

export function initFirebase() {
  if (initialized) return admin;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "Firebase Admin credentials missing — real Firebase login will not work. Demo login still works."
    );
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  initialized = true;
  return admin;
}

export function getFirebaseAdmin() {
  return initialized ? admin : initFirebase();
}
