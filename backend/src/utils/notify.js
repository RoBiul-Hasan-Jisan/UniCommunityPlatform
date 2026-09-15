import Notification from "../models/Notification.js";

export async function notify(userId, type, text, link = "") {
  try {
    await Notification.create({ user: userId, type, text, link });
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
}
