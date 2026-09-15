const express = require("express");
const { listConversations, getOrCreateConversation, getMessages } = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.get("/conversations", protect, listConversations);
router.post("/conversations", protect, getOrCreateConversation);
router.get("/conversations/:id/messages", protect, getMessages);

module.exports = router;
