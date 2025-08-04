// Updated user controller with the new getClientProfileById method
const User = require("../models/User");
const Worker = require("../models/Worker");
const Review = require("../models/Review");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Service = require("../models/Service"); // Assuming the User model is defined in this path

const {
  sendResetPasswordMail,
  sendEmailToAdmin,
} = require("../middlewares/mailSender");

// Get authenticated user profile
exports.getMyProfile = async (req, res) => {
  try {
    console.log(req.user); // Debugging: Check the logged-in user's details

    let user = null;

    // Check if the user's role is 'worker'
    if (req.user.role === "worker") {
      // Find the worker profile associated with the user
      const worker = await Worker.findOne({ user: req.user._id }).populate(
        "user",
        "-password"
      );

      if (!worker) {
        return res.status(404).json({ message: "Worker profile not found" });
      }

      // Return the worker profile along with user details
      user = worker;
    } else {
      // For non-worker roles, return the user profile
      user = await User.findById(req.user._id).select("-password");
    }

    // If no user is found, return a 404 error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user or worker data
    res.status(200).json(user);
  } catch (error) {
    // Handle any errors
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
// Get user profile by ID
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Fetch the user by ID
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Handle worker-specific logic
    if (user.role === "worker") {
      // Find the worker profile associated with the user
      const worker = await Worker.findOne({ user: userId });
      if (!worker) {
        return res.status(404).json({ message: "Worker profile not found" });
      }

      // Fetch all public services provided by the worker
      const services = await Service.find({
        worker: worker._id,
        audience: "public",
      });

      // Return worker details along with their public services
      return res.status(200).json({
        user: {
          ...user.toObject(), // Spread user details
          workerProfile: worker.toObject(), // Include worker profile
          services, // Include public services
        },
      });
    }

    // Handle regular user-specific logic
    if (user.role === "user") {
      console.log("Fetching reviews for user:", userId);
      // Fetch all reviews written by the user
      const reviews = await Review.find({ user: userId }).populate("service");
      console.log({
        user,
        reviews,
      });
      // Return user details along with their reviews
      return res.status(200).json({
        user,
        reviews,
      });
    }

    // Default response for other roles (e.g., admin)
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// Get client profile by ID with reviews
exports.getClientProfileById = async (req, res) => {
  try {
    const clientId = req.params.id;

    // Find the user by ID
    const user = await User.findById(clientId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check if user is a client (not a worker or admin)
    if (user.role === "worker" || user.role === "admin") {
      return res.status(400).json({ message: "User is not a client" });
    }

    // Get reviews made by this client
    const reviews = await Review.find({ user: clientId })
      .populate({
        path: "service",
        select: "title _id",
      })
      .populate({
        path: "user",
        select: "firstName lastName profileImage _id",
      })
      .sort({ createdAt: -1 });

    // Return client data with reviews
    res.status(200).json({
      user,
      reviews,
    });
  } catch (error) {
    console.error("Get client profile error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Change user password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    console.log("Password changed successfully");

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: 1000000,
    });

    await sendResetPasswordMail(email, token);
    res.status(200).json({ message: "Email de réinitialisation envoyé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    console.log("Password reset successful");
    res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.sendEmailToAdmin = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ error: "Tous les champs requis ne sont pas remplis." });
  }

  try {
    await sendEmailToAdmin(name, email, phone, subject, message);
    res
      .status(200)
      .json({ message: "Votre message a été envoyé avec succès." });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error);
    res
      .status(500)
      .json({ error: "Erreur serveur. Veuillez réessayer plus tard." });
  }
};

// Update user profile
exports.updateMyProfile = async (req, res) => {
  try {
    // Get user ID from authenticated user
    const userId = req.user._id;

    // Get fields to update from request body
    const updateData = { ...req.body };

    // Remove any sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.role;
    delete updateData._id;

    // Check if profile image was uploaded and add to update data
    if (req.body.profileImage) {
      updateData.profileImage = req.body.profileImage;
    }

    let user = null;

    // Handle different user types (regular user vs worker)
    if (req.user.role === "worker") {
      // Update worker profile
      const worker = await Worker.findOneAndUpdate(
        { user: userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate("user", "-password");

      if (!worker) {
        return res.status(404).json({ message: "Worker profile not found" });
      }

      user = worker;
    } else {
      // Update regular user
      user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};
