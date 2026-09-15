const express = require("express");
const { getUserById, updateMe, uploadPhoto, uploadCertificate } = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.patch("/me", protect, updateMe);
router.post("/me/photo", protect, upload.single("photo"), uploadPhoto);
router.post("/me/certificate", protect, upload.single("certificate"), uploadCertificate);
router.get("/:id", protect, getUserById);

module.exports = router;
