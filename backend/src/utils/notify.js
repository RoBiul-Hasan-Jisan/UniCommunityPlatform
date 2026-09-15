import Notification from "../models/Notification.js";
import { getIO } from "../socket.js";

export async function notify(userId, type, text, link = "") {
  try {
    const notification = await Notification.create({ user: userId, type, text, link });
    // Push it live to the recipient if they're online, so the bell badge
    // updates instantly instead of waiting for their next page load.
    getIO()?.to(`user:${userId}`).emit("notification:new", notification);
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
}
