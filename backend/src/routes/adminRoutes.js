const express = require("express");
const { listPendingAlumni, approveAlumni, rejectAlumni, getStats } = require("../controllers/adminController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(protect, requireRole("admin"));
router.get("/pending-alumni", listPendingAlumni);
router.patch("/alumni/:id/approve", approveAlumni);
router.patch("/alumni/:id/reject", rejectAlumni);
router.get("/stats", getStats);

module.exports = router;
