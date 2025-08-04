//service.routes.js
const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/service.controller");
const {
  authMiddleware,
  workerMiddleware,
} = require("../middlewares/auth.middleware");
const uploadMiddleware = require("../middlewares/upload.middleware");

// Create a new service (worker only)
router.post(
  "/",
  authMiddleware,
  workerMiddleware,
  uploadMiddleware.uploadServiceImages,
  serviceController.createService
);

// Get all public services
router.get("/", serviceController.getAllServices);

// Search services
router.get("/search", serviceController.searchServices);

// Get my services (worker only)
router.get("/my-services", authMiddleware, serviceController.getMyServices);

// Change service audience (public/private)
router.patch(
  "/:id/audience",
  authMiddleware,
  serviceController.changeServiceAudience
);

// Get service by ID
router.get("/:id", serviceController.getServiceById);

// Update service (worker only)
router.put(
  "/:id",
  authMiddleware,
  uploadMiddleware.uploadServiceImages,
  serviceController.updateService
);

// Delete service (worker only)
router.delete("/:id", authMiddleware, serviceController.deleteService);

module.exports = router;
