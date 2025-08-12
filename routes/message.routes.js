const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { uploadChatFile } = require("../middlewares/upload.middleware");
const messageController = require("../controllers/message.controller");

// Get messages for a conversation
router.get("/:conversationId", authMiddleware, messageController.getMessages);

// Send a new message
// Accept either content or file (or both)
router.post(
  "/:conversationId",
  [
    authMiddleware,
    uploadChatFile,
    // No need to require content, handled in controller
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
