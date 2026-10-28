import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { getIO } from "../socket.js";
import { sendMail } from "./mailer.js";
import { sendPush } from "./push.js";
import { logger } from "./logger.js";

// Only these notification types are worth an email. Chat messages, reactions
// and comments stay in-app/push only — emailing those would be noise.
const EMAIL_TYPES = new Set([
  "connection_request", "connection_accepted", "mentorship_request", "mentorship_update",
  "referral_request", "referral_update", "office_hours_booked", "office_hours_cancelled",
  "workshop_update", "workshop_upcoming", "event_reminder", "report_update", "admin",
]);

const EMAIL_SUBJECT = {
  connection_request: "New connection request",
  connection_accepted: "Your connection request was accepted",
  mentorship_request: "New mentorship request",
  mentorship_update: "Update on your mentorship request",
  referral_request: "New referral request",
  referral_update: "Update on your referral request",
  office_hours_booked: "Your office hours slot was booked",
  office_hours_cancelled: "An office hours slot was cancelled",
  workshop_update: "Workshop update",
  workshop_upcoming: "Workshop starting soon",
  event_reminder: "Event reminder",
  report_update: "Update on your report",
  admin: "Message from UniConnect admins",
};

export async function notify(userId, type, text, link = "") {
  try {
    const notification = await Notification.create({ user: userId, type, text, link });
    // Push it live to the recipient if they're online, so the bell badge
    // updates instantly instead of waiting for their next page load.
    getIO()?.to(`user:${userId}`).emit("notification:new", notification);

    // Out-of-app channels (email / web push) run in the background and can
    // never make the original request fail.
    deliverExternally(userId, type, text, link).catch((err) =>
      logger.warn({ err: err.message }, "External notification delivery failed")
    );
  } catch (err) {
    logger.error({ err: err.message }, "Notification failed");
  }
}

async function deliverExternally(userId, type, text, link) {
  const user = await User.findById(userId).select("email emailNotifications isDemo status").lean();
  if (!user || user.status === "disabled") return;

  sendPush(userId, { title: "UniConnect", body: text, url: link || "/notifications" }).catch(() => {});

  // Never email seeded demo accounts (their addresses are fake).
  if (EMAIL_TYPES.has(type) && user.emailNotifications !== false && !user.isDemo) {
    await sendMail({ to: user.email, subject: EMAIL_SUBJECT[type] || "UniConnect notification", text, link });
  }
}
