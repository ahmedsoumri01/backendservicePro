const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // Adjust the path as needed
const connectDB = require("./config/db");

async function seedDefaultAdmin() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash("123456789aa", 10);

    // Create admin user
    const admin = new User({
      firstName: "Admin",
      lastName: "User",
      email: "admin@yopmail.com",
      password: hashedPassword,
      phone: "71234567",
      role: "admin",
      adress: "Tunis, Tunisia",
      status: "active",
      isProfileCompleted: true,
      firstTimeLogin: false,
    });

    // Save admin to database
    await admin.save();

    console.log("Default admin created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding default admin:", error);
    process.exit(1);
  }
}

seedDefaultAdmin();
