import webpush from "web-push";
import PushSubscription from "../models/PushSubscription.js";
import { logger } from "./logger.js";

// Web push is optional — enabled only when VAPID keys are configured.
// Generate keys once with:  npx web-push generate-vapid-keys
let configured = false;
export function pushEnabled() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export async function sendPush(userId, { title, body, url }) {
  if (!pushEnabled()) return;
  const subs = await PushSubscription.find({ user: userId }).lean();
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          JSON.stringify({ title, body, url })
        );
      } catch (err) {
        // 404/410 = the browser unsubscribed; clean it up.
        if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ _id: s._id });
        else logger.warn({ err: err.message }, "Push send failed");
      }
    })
  );
}
