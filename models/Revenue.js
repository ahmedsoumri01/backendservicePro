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
    workerName: { type: String, required: true, trim: true },
    workerPhone: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, required: true, trim: true },
    clientAddress: { type: String, required: false, trim: false },
    task: { type: String, required: true, trim: true },

    // Billing Information
    billingType: {
      type: String,
      enum: ["hourly", "fixed"],
      required: true,
    },

    // Hourly billing details (only required if billingType is 'hourly')
    hours: {
      type: Number,
      min: 0,
      required: function () {
        return this.billingType === "hourly";
      },
    },
    hourlyRate: {
      type: Number,
      min: 0,
      required: function () {
        return this.billingType === "hourly";
      },
    },

    // Fixed billing details (only required if billingType is 'fixed')
    fixedPrice: {
      type: Number,
      min: 0,
      required: function () {
        return this.billingType === "fixed";
      },
    },

    totalPrice: { type: Number, required: true, min: 0 },
    completedAt: { type: Date, default: Date.now },
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Revenue", revenueSchema);
