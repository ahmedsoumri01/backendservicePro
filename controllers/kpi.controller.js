const User = require("../models/User");
const Worker = require("../models/Worker");
const Service = require("../models/Service");
const Review = require("../models/Review");
const Report = require("../models/Report");
const { default: mongoose } = require("mongoose");

exports.adminStatistics = async (req, res) => {
  try {
    // Count total users
    const totalUsers = await User.countDocuments();

    // Count users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    // Count active and blocked users
    const userStatus = await User.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Count workers
    const totalWorkers = await Worker.countDocuments();

    // Count services
    const totalServices = await Service.countDocuments();

    // Count reports
    const totalReports = await Report.countDocuments();

    // Optional: Group reports by status (if your Report model has a 'status' field)
    const reportsByStatus = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Reviews - average rating and count
    const reviews = await Review.find().select("rating");
    const totalRatings = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating =
      totalRatings > 0 ? (sumRatings / totalRatings).toFixed(2) : "0.00";

    // Revenue from services
    const revenueResult = await Service.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$price" } } },
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Format stats
    const stats = {
      totalUsers,
      usersByRole: Object.fromEntries(usersByRole.map((r) => [r._id, r.count])),
      userStatus: Object.fromEntries(userStatus.map((s) => [s._id, s.count])),
      totalWorkers,
      totalServices,
      reports: {
        totalReports,
        byStatus: Object.fromEntries(
          reportsByStatus.map((s) => [s._id, s.count])
        ),
      },
      totalRevenue,
      averageRating: parseFloat(avgRating),
    };

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching admin statistics:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get worker statistics
 * GET /worker/stats/:workerId
 */
exports.workerStatistics = async (req, res) => {
  try {
    const { workerId } = req.params;

    // Check if valid MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid worker ID" });
    }

    // Find the worker and populate user info
    const worker = await Worker.findById(workerId).populate("user");
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    const userId = worker.user._id;

    // Count total services owned by the worker
    const totalServices = await Service.countDocuments({ worker: workerId });

    // Count private and public services using aggregation
    const serviceVisibility = await Service.aggregate([
      { $match: { worker: new mongoose.Types.ObjectId(workerId) } }, // <-- Fixed here with `new`
      { $group: { _id: "$audience", count: { $sum: 1 } } },
    ]);

    const visibilityCount = {
      public: 0,
      private: 0,
      ...(Object.fromEntries(
        serviceVisibility.map(({ _id, count }) => [_id, count])
      ) || {}),
    };

    // Get all service IDs for this worker
    const serviceIds = await Service.find({ worker: workerId }).distinct("_id");

    // Count reviews and calculate average rating
    const reviews = await Review.find({
      service: { $in: serviceIds },
    });

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          ).toFixed(2)
        : "0.00";

    // Count reports against the worker (via reportedUser)
    const totalReports = await Report.countDocuments({ reportedUser: userId });

    // Format response
    const stats = {
      workerId,
      totalServices,
      servicesByVisibility: visibilityCount,
      totalReviews,
      averageRating: parseFloat(avgRating),
      totalReports,
    };

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching worker statistics:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
