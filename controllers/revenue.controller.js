const Worker = require("../models/Worker");
const mongoose = require("mongoose");
const User = require("../models/User");
const Revenue = require("../models/Revenue");
const Reservation = require("../models/Reservation");

// @desc    Create revenue from finished reservation
// @route   POST /api/revenue
// @access  Private (Worker)
const addRevenue = async (req, res) => {
  try {
    const { reservationId } = req.body;
    const workerId = req.user.id; // Assuming you have middleware that sets req.user
    // Validate reservation ID
    if (!reservationId || !mongoose.Types.ObjectId.isValid(reservationId)) {
      return res.status(400).json({
        success: false,
        message: "Valid reservation ID is required",
      });
    }

    // Find the reservation
    const reservation = await Reservation.findById(reservationId)
      .populate("worker")
      .populate("client");

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    // Check if reservation belongs to the worker
    if (reservation.worker.user.toString() !== workerId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create revenue for this reservation",
      });
    }

    // Check if reservation is finished
    if (reservation.status !== "finished") {
      return res.status(400).json({
        success: false,
        message: "Only finished reservations can be converted to revenue",
      });
    }

    // Check if revenue already exists for this reservation
    const existingRevenue = await Revenue.findOne({
      reservation: reservationId,
    });
    if (existingRevenue) {
      return res.status(400).json({
        success: false,
        message: "Revenue already exists for this reservation",
      });
    }

    // Get worker and client details
    const worker = await User.findById(reservation.worker.user);
    const client = await User.findById(reservation.client);

    if (!worker || !client) {
      return res.status(404).json({
        success: false,
        message: "Worker or client not found",
      });
    }

    // Prepare revenue data
    const revenueData = {
      worker: reservation.worker._id,
      client: reservation.client,
      workerName: `${worker.firstName} ${worker.lastName}`,
      workerPhone: worker.phone || "",
      clientName: reservation.clientName,
      clientPhone: reservation.clientPhone,
      clientAddress: client.adress || "",
      task: reservation.taskDescription,
      billingType: reservation.billingType,
      totalPrice: reservation.totalPrice,
      reservation: reservation._id,
    };

    // Add billing-specific fields
    if (reservation.billingType === "hourly") {
      revenueData.hours = reservation.hours;
      revenueData.hourlyRate = reservation.hourlyRate;
    } else if (reservation.billingType === "fixed") {
      revenueData.fixedPrice = reservation.fixedPrice;
    }

    // Create revenue
    const revenue = new Revenue(revenueData);
    const savedRevenue = await revenue.save();

    // Optionally populate the response
    const populatedRevenue = await Revenue.findById(savedRevenue._id)
      .populate("worker", "user")
      .populate("client", "firstName lastName email phone adress")
      .populate("reservation");

    res.status(201).json({
      success: true,
      message: "Revenue created successfully",
      data: populatedRevenue,
    });
  } catch (error) {
    console.error("Error creating revenue:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Get all revenue for a worker
// @route   GET /api/revenue
// @access  Private (Worker)
const getAllRevenue = async (req, res) => {
  try {
    const workerId = req.user.id; // Assuming you have middleware that sets req.user
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find worker document
    const worker = await Worker.findOne({ user: workerId });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Get revenues with pagination
    const revenues = await Revenue.find({ worker: worker._id })
      .populate("client", "firstName lastName email phone")
      .populate("reservation")
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Revenue.countDocuments({ worker: worker._id });

    res.status(200).json({
      success: true,
      message: "Revenues fetched successfully",
      data: {
        revenues,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRevenues: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching revenues:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Get revenue by ID
// @route   GET /api/revenue/:id
// @access  Private (Worker)
const getRevenueById = async (req, res) => {
  try {
    const { id } = req.params;
    const workerId = req.user.id; // Assuming you have middleware that sets req.user

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid revenue ID",
      });
    }

    // Find revenue and populate references
    const revenue = await Revenue.findById(id)
      .populate("worker", "user")
      .populate("client", "firstName lastName email phone adress")
      .populate("reservation");

    if (!revenue) {
      return res.status(404).json({
        success: false,
        message: "Revenue not found",
      });
    }

    // Check if revenue belongs to the worker
    if (revenue.worker.user.toString() !== workerId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this revenue",
      });
    }

    res.status(200).json({
      success: true,
      message: "Revenue fetched successfully",
      data: revenue,
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Get revenues by date range
// @route   GET /api/revenue/date-range
// @access  Private (Worker)
const getRevenueByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const workerId = req.user.id;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    // Find worker
    const worker = await Worker.findOne({ user: workerId });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Get revenues in date range
    const revenues = await Revenue.find({
      worker: worker._id,
      completedAt: {
        $gte: start,
        $lte: end,
      },
    })
      .populate("client", "firstName lastName email phone")
      .populate("reservation")
      .sort({ completedAt: -1 });

    // Calculate total revenue
    const totalRevenue = revenues.reduce(
      (sum, revenue) => sum + revenue.totalPrice,
      0
    );

    res.status(200).json({
      success: true,
      message: "Revenues by date range fetched successfully",
      data: {
        revenues,
        summary: {
          totalRevenue,
          count: revenues.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching revenues by date range:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  addRevenue,
  getAllRevenue,
  getRevenueById,
  getRevenueByDateRange,
};
