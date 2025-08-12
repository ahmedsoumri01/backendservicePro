const Report = require("../models/Report");
const User = require("../models/User");

// Get all reports (admin only)
exports.getAllReportDemandes = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalReports = await Report.countDocuments();

    // Fetch reports with pagination
    const reports = await Report.find()
      .populate("reporter", "firstName lastName email profileImage")
      .populate("reportedUser", "firstName lastName email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Return reports with pagination info
    res.status(200).json({
      reports,
      currentPage: page,
      totalPages: Math.ceil(totalReports / limit),
      totalReports,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Change report status (admin only)
exports.changeReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["pending", "reviewed", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Find and update report
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status;
    await report.save();

    res.status(200).json({
      message: "Report status updated successfully",
      report,
    });
  } catch (error) {
    console.error("Error updating report status:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get reports created by the current user
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user._id })
      .populate("reportedUser", "firstName lastName email profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching user reports:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Create a new report
exports.createReport = async (req, res) => {
  try {
    const { reportedUserId, reason } = req.body;

    // Validate input
    if (!reportedUserId || !reason) {
      return res
        .status(400)
        .json({ message: "Reported user ID and reason are required" });
    }

    // Prevent self-reporting
    if (reportedUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    // Check if reported user exists
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ message: "Reported user not found" });
    }

    // Create new report
    const newReport = new Report({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      reason,
      status: "pending",
    });

    await newReport.save();

    // Populate user details for response
    const populatedReport = await Report.findById(newReport._id)
      .populate("reporter", "firstName lastName email profileImage")
      .populate("reportedUser", "firstName lastName email profileImage");

    res.status(201).json({
      message: "Report created successfully",
      report: populatedReport,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Delete a report (admin or report creator)
exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Find report
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Check permissions (admin or report creator)
    if (
      req.user.role !== "admin" &&
      report.reporter.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this report" });
    }

    // Delete report
    await Report.findByIdAndDelete(id);

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
