const express = require("express");
const { listNotifications, markRead, markAllRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.get("/", protect, listNotifications);
router.patch("/:id/read", protect, markRead);
router.patch("/read-all", protect, markAllRead);

module.exports = router;
