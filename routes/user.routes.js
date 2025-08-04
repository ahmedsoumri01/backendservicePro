// Update the user routes to include the new endpoint
const express = require("express");
const { authMiddleware } = require("../middlewares/auth.middleware");
const {
  getMyProfile,
  requestPasswordReset,
  resetPassword,
  sendEmailToAdmin,
  updateMyProfile,
  getUserById,
  getClientProfileById,
  getUserProfile,
} = require("../controllers/user.controller");
const { uploadProfileImage } = require("../middlewares/upload.middleware");
const router = express.Router();

// Profile routes
router.get("/profile", authMiddleware, getMyProfile);
router.put(
  "/profile/update",
  authMiddleware,
  uploadProfileImage,
  updateMyProfile
);

// Get user by ID
router.get("/user/:id", getUserById);
router.get("/user-profile/:id", getUserProfile);

// Get client profile by ID with reviews
router.get("/client/:id", getClientProfileById); // Add the new route

// Password reset routes
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

// sendEmailToAdmin
router.post("/send-email-to-admin", sendEmailToAdmin);

module.exports = router;
