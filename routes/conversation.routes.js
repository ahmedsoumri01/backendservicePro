const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { authMiddleware } = require("../middlewares/auth.middleware");
const conversationController = require("../controllers/conversation.controller");

// Get all conversations for current user
router.get("/", authMiddleware, conversationController.getUserConversations);

// Get a single conversation by ID
router.get("/:id", authMiddleware, conversationController.getConversationById);

// Create a new conversation
router.post(
  "/",
  [
    authMiddleware,
    check("participantId", "Participant ID is required").not().isEmpty(),
    check("initialMessage", "Message content is required").optional(),
  ],
  conversationController.createConversation
);

// Archive a conversation
router.put(
  "/:id/archive",
  authMiddleware,
  conversationController.archiveConversation
);

module.exports = router;
