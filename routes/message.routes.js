const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { authMiddleware } = require("../middlewares/auth.middleware");
const messageController = require("../controllers/message.controller");

// Get messages for a conversation
router.get("/:conversationId", authMiddleware, messageController.getMessages);

// Send a new message
router.post(
  "/:conversationId",
  [
    authMiddleware,
    check("content", "Message content is required").not().isEmpty(),
  ],
  messageController.sendMessage
);

// Mark messages as read
router.put(
  "/:conversationId/read",
  authMiddleware,
  messageController.markAsRead
);

module.exports = router;
