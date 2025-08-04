const express = require("express");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { getUserById } = require("../controllers/user.controller");
const {
  createAdmin,
  getAllUsers,
  changeUserAccountStatus,
  deleteUserById,
  updateUser,
  getAllServicesOfUsers,
  deleteService,
} = require("../controllers/admin.controller");
const { changePassword } = require("../controllers/user.controller");
const { getAllWorkers } = require("../controllers/worker.controller");

const router = express.Router();

// Route: Create admin account

router.post("/create-admin", authMiddleware, createAdmin);

// Route: Get all workers

router.get("/get-workers", authMiddleware, getAllWorkers);

// Route: Get all users

router.get("/get-users", authMiddleware, getAllUsers);

// Route: Change user account status

router.put("/change-user-status", authMiddleware, changeUserAccountStatus);

// Route: Get user by ID

router.get("/get-user/:id", authMiddleware, getUserById);

// Route: Delete user by ID

router.delete("/delete-user/:id", authMiddleware, deleteUserById);

// Route: Update user by ID

router.put("/update-user/:id", authMiddleware, updateUser);

// Route: Change password

router.put("/change-password/:id", authMiddleware, changePassword);

//route : get all services of users
router.get("/get-services", getAllServicesOfUsers);

// Route: delete service of users
router.delete("/delete-service", authMiddleware, deleteService);

module.exports = router;
