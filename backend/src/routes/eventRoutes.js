const express = require("express");
const { listEvents, getEvent, createEvent, rsvpEvent } = require("../controllers/eventController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();
router.get("/", protect, listEvents);
router.get("/:id", protect, getEvent);
router.post("/", protect, requireRole("admin"), createEvent);
router.patch("/:id/rsvp", protect, rsvpEvent);

module.exports = router;
