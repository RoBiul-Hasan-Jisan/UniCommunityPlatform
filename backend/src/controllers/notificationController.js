const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
  res.json({ success: true, notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { read: true });
  res.json({ success: true });
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});

module.exports = { listNotifications, markRead, markAllRead };
