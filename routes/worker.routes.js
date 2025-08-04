const express = require("express");
const {
  completeWorkerProfile,
  MyWorkerProfile,
  updateAvailability,
  updateWorkerData,
  updateUserData,
  getAllWorkers,
  getWorkerById,
} = require("../controllers/worker.controller");
const {
  addReservation,
  updateReservation,
  getAllReservations,
  getReservationById,
  deleteReservation,
  changeReservationStatus,
  createAvance,
} = require("../controllers/reservation.controller");
const {
  addRevenue,
  getAllRevenue,
  getRevenueById,
  getRevenueByDateRange,
} = require("../controllers/revenue.controller");
const {
  authMiddleware,
  workerMiddleware,
} = require("../middlewares/auth.middleware");
const { uploadProfileImage } = require("../middlewares/upload.middleware");

// Import subscription controller functions
const {
  getSubscriptionStatus,
  isEligibleForFreeTrial,
  assignFreeTrial,
  assignPlan,
} = require("../controllers/subscription.controller");

const router = express.Router();

// ==================== WORKER ROUTES ====================

// Complete worker profile with image upload middleware
router.put(
  "/complete-profile-worker",
  authMiddleware,
  workerMiddleware,
  uploadProfileImage,
  completeWorkerProfile
);

// Get worker profile
router.get(
  "/my-profile-worker",
  authMiddleware,
  workerMiddleware,
  MyWorkerProfile
);

// Get all workers
router.get("/all-workers", authMiddleware, getAllWorkers);

// Update availability
router.patch(
  "/update-availability",
  authMiddleware,
  workerMiddleware,
  updateAvailability
);

// Update worker data
router.put(
  "/update-worker-data",
  authMiddleware,
  workerMiddleware,
  updateWorkerData
);

// Update user data with optional profile image
router.put(
  "/update-user-data",
  authMiddleware,
  uploadProfileImage,
  updateUserData
);

// Get worker by ID (public or protected based on use case)
router.get("/worker/:id", authMiddleware, getWorkerById); // assuming protected

// ==================== RESERVATION ROUTES ====================

// Add reservation
router.post(
  "/add-reservation",
  authMiddleware,
  workerMiddleware,
  addReservation
);

// Update reservation
router.put(
  "/update-reservation/:workerId/:reservationId",
  authMiddleware,
  workerMiddleware,
  updateReservation
);

// Get all reservations by worker
router.get(
  "/reservations/:workerId",
  authMiddleware,
  workerMiddleware,
  getAllReservations
);

// Get reservation by ID
router.get(
  "/reservation/:workerId/:reservationId",
  authMiddleware,
  workerMiddleware,
  getReservationById
);

// Delete reservation
router.delete(
  "/delete-reservation/:workerId/:reservationId",
  authMiddleware,
  workerMiddleware,
  deleteReservation
);

// Change reservation status
router.put(
  "/change-reservation-status/:workerId/:reservationId",
  authMiddleware,
  workerMiddleware,
  changeReservationStatus
);
//create avance :
router.post(
  "/:workerId/:reservationId/avance",
  authMiddleware,
  workerMiddleware,
  createAvance
);
// ==================== REVENUE ROUTES ====================

// Add revenue (create from finished reservation)
router.post("/add-revenue", authMiddleware, workerMiddleware, addRevenue);

// Get all revenue for worker with pagination
router.get("/revenue", authMiddleware, workerMiddleware, getAllRevenue);

// Get specific revenue by ID
router.get("/revenue/:id", authMiddleware, workerMiddleware, getRevenueById);

// Get revenue by date range
router.get(
  "/revenue-date-range",
  authMiddleware,
  workerMiddleware,
  getRevenueByDateRange
);

// ==================== SUBSCRIPTION ROUTES ====================

/**
 * Check if the worker is eligible for a free trial
 * @route GET /api/subscription/eligible
 * @access Private (Worker only)
 */
router.get(
  "/subscription/eligible",
  authMiddleware,
  workerMiddleware,
  isEligibleForFreeTrial
);

/**
 * Assign a 7-day free trial to the worker
 * @route POST /api/subscription/free-trial
 * @access Private (Worker only)
 */
router.post(
  "/subscription/free-trial",
  authMiddleware,
  workerMiddleware,
  assignFreeTrial
);

/**
 * Get current subscription status (active/expired/inactive)
 * @route GET /api/subscription/status
 * @access Private (Worker only)
 */
router.get(
  "/subscription/status",
  authMiddleware,
  workerMiddleware,
  getSubscriptionStatus
);

/**
 * [Admin or Internal Use] Assign a plan to a worker (e.g., Basic, Pro, DemoAccount)
 * @route POST /api/subscription/assign-plan/:userId
 * @access Private (Admin or self with permission)
 * @body { planType: string }
 */
router.post(
  "/subscription/assign-plan/:userId",
  authMiddleware,
  // Optional: add admin middleware if only admins can assign plans
  // adminMiddleware,
  assignPlan
);

// =========================================================

module.exports = router;
