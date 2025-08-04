const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/auth.middleware");
const {
  getAllReportDemandes,
  changeReportStatus,
  getMyReports,
  createReport,
  deleteReport
} = require("../controllers/report.controller");

// Get all reports (admin only)
router.get("/", authMiddleware, getAllReportDemandes);

// Get current user's reports
router.get("/my-reports", authMiddleware, getMyReports);

// Create a new report
router.post("/", authMiddleware, createReport);

// Update report status (admin only)
router.put("/:id/status", authMiddleware, changeReportStatus);

// Delete a report (admin or report creator)
router.delete("/:id", authMiddleware, deleteReport);

module.exports = router;
