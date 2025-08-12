const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: false, // Optional, only if conversation is related to a service
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ensure participants are unique in a conversation
/* ConversationSchema.index({ participants: 1 }, { unique: true }); */

module.exports = mongoose.model("Conversation", ConversationSchema);
