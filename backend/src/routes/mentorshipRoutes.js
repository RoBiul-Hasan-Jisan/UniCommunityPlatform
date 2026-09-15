const express = require("express");
const { sendRequest, respondToRequest, listMyRequests } = require("../controllers/mentorshipController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();
router.get("/", protect, listMyRequests);
router.post("/", protect, requireRole("student"), sendRequest);
router.patch("/:id/respond", protect, requireRole("alumni"), respondToRequest);

module.exports = router;
