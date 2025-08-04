const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["user", "worker", "admin"], default: "user" },
    adress: { type: String, trim: true },
    profileImage: { type: String, default: "" },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    isProfileCompleted: { type: Boolean, default: false },
    firstTimeLogin: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
