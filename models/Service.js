const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    category: { type: String, required: true, trim: true },
    images: [{ type: String }], // URLs of service images
    location: { type: String },
    videos: [{ type: String }], // URLs of service videos
    audience: { type: String, enum: ["public", "private"], default: "public" }, // Visibility control
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", ServiceSchema);
