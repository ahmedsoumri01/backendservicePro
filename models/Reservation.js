const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
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
    clientName: { type: String, required: true, trim: true },
    clientPhone: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    taskDescription: { type: String, required: true },
    billingType: {
      type: String,
      enum: ["hourly", "fixed"],
      required: true,
      default: "hourly",
    },
    // For hourly billing
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
    // For fixed billing (forfait)
    fixedPrice: {
      type: Number,
      min: 0,
      required: function () {
        return this.billingType === "fixed";
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmedWithClient", "finished", "canceled"],
      default: "pending",
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String },

    // Array to track advances (avances)
    avances: [
      {
        montant: {
          type: Number,
          required: true,
          min: 0,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Pre-save middleware to calculate total price
reservationSchema.pre("save", function (next) {
  if (this.billingType === "hourly") {
    this.totalPrice = this.hours * this.hourlyRate;
  } else if (this.billingType === "fixed") {
    this.totalPrice = this.fixedPrice;
  }
  next();
});

module.exports = mongoose.model("Reservation", reservationSchema);
