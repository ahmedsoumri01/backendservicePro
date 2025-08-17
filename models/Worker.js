const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    skills: [{ type: String, trim: true }],
    experience: { type: Number, min: 0 },
    specialization: { type: String, trim: true, required: true },
    availability: { type: Boolean, default: true },
    reservations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Reservation" },
    ],
    revenue: [{ type: mongoose.Schema.Types.ObjectId, ref: "Revenue" }],

    // Subscription fields
    subscription: {
      plan: {
        type: String,
        enum: [
          "FreeTrial",
          "basicPlan",
          "ProPlan",
          "premiumPlan",
          "DemoAccount",
        ],
        default: null,
      },
      startDate: Date,
      endDate: Date,
      isActive: { type: Boolean, default: false },
    },
    freeTrialInfo: {
      hasUsed: { type: Boolean, default: false },
      lastUsed: Date,
      expirationDate: Date,
    },
    socialMedia: {
      facebookLink: { type: String, trim: true, default: "" },
      linkedinLink: { type: String, trim: true, default: "" },
      instagramLink: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
