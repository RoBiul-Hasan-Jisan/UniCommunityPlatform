const Notification = require("../models/Notification");

// Mirrors the original createNotification() Cloud Function helper.
// If io + a userSocketMap are provided, also pushes the notification in real time.
async function createNotification(io, userId, { type, title, body, route = "", entityId = "" }) {
  const notification = await Notification.create({
    userId,
    type,
    title,
    body,
    payload: { route, entityId },
  });

  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }

  return notification;
}

module.exports = { createNotification };
