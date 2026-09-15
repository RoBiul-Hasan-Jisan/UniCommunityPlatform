const express = require("express");
const { listJobs, getJob, postJob, closeJob } = require("../controllers/jobController");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();
router.get("/", protect, listJobs);
router.get("/:id", protect, getJob);
router.post("/", protect, requireRole("alumni", "admin"), postJob);
router.patch("/:id/close", protect, closeJob);

module.exports = router;
