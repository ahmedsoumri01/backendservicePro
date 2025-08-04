// Enhanced conversation controller with fixes for worker access

const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
const { validationResult } = require("express-validator");

// Get all conversations for the current user
exports.getUserConversations = async (req, res) => {
  try {
    // Ensure user has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    console.log(
      `Fetching conversations for user: ${req.user._id} (${req.user.role})`
    );

    const conversations = await Conversation.find({
      participants: { $in: [req.user._id] },
      isActive: true,
    })
      .populate({
        path: "participants",
        select: "firstName lastName profileImage role",
      })
      .populate({
        path: "lastMessage",
        select: "content sender createdAt readBy",
      })
      .populate({
        path: "serviceId",
        select: "title price images",
      })
      .sort({ updatedAt: -1 });

    // Format conversations for client
    const formattedConversations = conversations.map((conv) => {
      // Get other participant (not the current user)
      const otherParticipants = conv.participants.filter(
        (p) => p._id.toString() !== req.user._id.toString()
      );

      // Check if current user has read the last message
      let unread = false;
      if (
        conv.lastMessage &&
        conv.lastMessage.sender &&
        conv.lastMessage.sender.toString() !== req.user._id.toString() &&
        !conv.lastMessage.readBy.includes(req.user._id)
      ) {
        unread = true;
      }

      return {
        _id: conv._id,
        participants: conv.participants,
        otherParticipants,
        lastMessage: conv.lastMessage,
        service: conv.serviceId,
        unread,
        updatedAt: conv.updatedAt,
      };
    });

    res.json(formattedConversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single conversation by ID
exports.getConversationById = async (req, res) => {
  try {
    // Ensure user has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const conversation = await Conversation.findById(req.params.id)
      .populate({
        path: "participants",
        select: "firstName lastName profileImage role",
      })
      .populate({
        path: "serviceId",
        select: "title price images",
      });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user is a participant
    if (
      !conversation.participants.some(
        (p) => p._id.toString() === req.user._id.toString()
      )
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this conversation" });
    }

    // Get messages for this conversation
    const messages = await Message.find({ conversation: conversation._id })
      .populate({
        path: "sender",
        select: "firstName lastName profileImage",
      })
      .sort({ createdAt: 1 });

    // Mark messages as read
    const unreadMessages = messages.filter(
      (msg) =>
        msg.sender._id.toString() !== req.user._id.toString() &&
        !msg.readBy.includes(req.user._id)
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
        unreadMessages.forEach((msg) => {
          io.to(conversation._id.toString()).emit("message_read", {
            userId: req.user._id,
            messageIds: [msg._id],
          });
        });
      }
    }

    res.json({
      conversation,
      messages,
    });
  } catch (error) {
    console.error("Error getting conversation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new conversation
exports.createConversation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Ensure user has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { participantId, serviceId, initialMessage } = req.body;

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
      ...(serviceId ? { serviceId } : {}),
    });

    // If conversation doesn't exist, create it
    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, participantId],
        ...(serviceId ? { serviceId } : {}),
      });
      await conversation.save();
    }

    // Create initial message if provided
    if (initialMessage) {
      const message = new Message({
        conversation: conversation._id,
        sender: req.user._id,
        content: initialMessage,
        readBy: [req.user._id],
      });
      await message.save();

      // Update conversation with last message
      conversation.lastMessage = message._id;
      await conversation.save();

      // Notify recipient
      const io = req.app.get("io");
      if (io) {
        io.to(participantId.toString()).emit("new_conversation", {
          conversation: conversation._id,
          sender: req.user._id,
          message: initialMessage,
        });

        io.to(conversation._id.toString()).emit("new_message", {
          _id: message._id,
          conversation: conversation._id,
          sender: {
            _id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            profileImage: req.user.profileImage,
          },
          content: initialMessage,
          readBy: [req.user._id],
          createdAt: message.createdAt,
        });
      }
    }

    // Return the conversation with populated fields
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate({
        path: "participants",
        select: "firstName lastName profileImage role",
      })
      .populate({
        path: "serviceId",
        select: "title price images",
      })
      .populate({
        path: "lastMessage",
        select: "content sender createdAt readBy",
      });

    res.status(201).json(populatedConversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Archive/deactivate a conversation
exports.archiveConversation = async (req, res) => {
  try {
    // Ensure user has a valid ID
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user is a participant
    if (!conversation.participants.includes(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Not authorized to archive this conversation" });
    }

    conversation.isActive = false;
    await conversation.save();

    res.json({ message: "Conversation archived successfully" });
  } catch (error) {
    console.error("Error archiving conversation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
