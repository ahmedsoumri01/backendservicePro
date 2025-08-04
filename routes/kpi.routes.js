const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth.middleware");

const {
  adminStatistics,
  workerStatistics,
} = require("../controllers/kpi.controller");

// Get all reports (admin only)
router.get("/admin", authMiddleware, adminStatistics);
router.get("/worker/:workerId", workerStatistics);

module.exports = router;
