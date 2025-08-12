const mongoose = require("mongoose");

const revenueSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation" },
    // Payment details
    amount: { type: Number, required: true, min: 0 }, // Amount paid (advance or full)
    status: {
      type: String,
      enum: ["advance", "partial", "final", "completed"],
      required: true,
      default: "advance",
    },
    paymentDate: { type: Date, default: Date.now },
    description: { type: String, trim: true },

    // SNAPSHOT FIELDS from Reservation for robust invoice
    clientName: { type: String, trim: true },
    clientPhone: { type: String, trim: true },
    title: { type: String, trim: true },
    taskDescription: { type: String, trim: true },
    billingType: { type: String, enum: ["hourly", "fixed"] },
    hours: { type: Number, min: 0 },
    hourlyRate: { type: Number, min: 0 },
    fixedPrice: { type: Number, min: 0 },
    totalPrice: { type: Number, min: 0 },
    reservationStatus: { type: String, trim: true },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Revenue", revenueSchema);
