const express = require("express");
const { listDirectory, getFacets } = require("../controllers/directoryController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.get("/", protect, listDirectory);
router.get("/facets", protect, getFacets);

module.exports = router;
