// Enhanced message controller with fixes for real-time messaging

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { validationResult } = require("express-validator");

// Get messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Ensure user has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Convert ObjectId to string for comparison
    const userIdStr = req.user._id.toString();
    const participantIds = conversation.participants.map((p) =>
      p.toString ? p.toString() : p
    );

    if (!participantIds.includes(userIdStr)) {
      return res
        .status(403)
        .json({ message: "Not authorized to view these messages" });
    }

    // Get messages with pagination
    const messages = await Message.find({ conversation: conversationId })
      .populate({
        path: "sender",
        select: "firstName lastName profileImage",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: 1 });

    // Get total count for pagination
    const total = await Message.countDocuments({
      conversation: conversationId,
    });

    // Mark messages as read
    const unreadMessages = messages.filter(
      (msg) =>
        msg.sender._id.toString() !== userIdStr &&
        !msg.readBy.includes(userIdStr)
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map((msg) => msg._id) },
        },
        {
          $addToSet: { readBy: req.user._id },
        }
      );

      // Notify other participants about read messages
      const io = req.app.get("io");
      if (io) {
        io.to(conversationId).emit("message_read", {
          userId: userIdStr,
          messageIds: unreadMessages.map((msg) => msg._id),
        });
      }
    }

    res.json({
      messages,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    // Ensure user has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Convert ObjectId to string for comparison
    const userIdStr = req.user._id.toString();
    const participantIds = conversation.participants.map((p) =>
      p.toString ? p.toString() : p
    );

    if (!participantIds.includes(userIdStr)) {
      return res
        .status(403)
        .json({
          message: "Not authorized to send messages in this conversation",
        });
    }

    // Create new message
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      content,
      readBy: [req.user._id], // Mark as read by sender
    });

    await message.save();

    // Update conversation's lastMessage and updatedAt
    conversation.lastMessage = message._id;
    await conversation.save();

    // Populate sender info for response
    await message.populate({
      path: "sender",
      select: "firstName lastName profileImage",
    });

    // Emit socket event to conversation participants
    const io = req.app.get("io");
    if (io) {
      // Emit to the conversation room
      io.to(conversationId).emit("new_message", {
        _id: message._id,
        conversation: conversationId,
        sender: {
          _id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          profileImage: req.user.profileImage,
        },
        content: message.content,
        readBy: message.readBy,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });

      // Also notify each participant individually for notifications
      participantIds.forEach((participantId) => {
        if (participantId !== userIdStr) {
          io.to(participantId).emit("message_notification", {
            conversationId,
            message: {
              _id: message._id,
              content: message.content,
              sender: {
                _id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                profileImage: req.user.profileImage,
              },
              createdAt: message.createdAt,
            },
          });
        }
      });
    } else {
      console.warn("Socket.io instance not available in request");
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Ensure user has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Convert ObjectId to string for comparison
    const userIdStr = req.user._id.toString();
    const participantIds = conversation.participants.map((p) =>
      p.toString ? p.toString() : p
    );

    if (!participantIds.includes(userIdStr)) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this conversation" });
    }

    // Find unread messages not sent by current user
    const unreadMessages = await Message.find({
      conversation: conversationId,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });

    const messageIds = unreadMessages.map((msg) => msg._id);

    // Update read status
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
      },
      {
        $addToSet: { readBy: req.user._id },
      }
    );

    // Notify other participants
    if (result.modifiedCount > 0) {
      const io = req.app.get("io");
      if (io) {
        io.to(conversationId).emit("message_read", {
          userId: userIdStr,
          messageIds,
        });
      }
    }

    res.json({
      message: "Messages marked as read",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
