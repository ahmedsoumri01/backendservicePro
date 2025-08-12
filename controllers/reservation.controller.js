const Worker = require("../models/Worker");
const mongoose = require("mongoose");
const User = require("../models/User");
const Reservation = require("../models/Reservation");
const Revenue = require("../models/Revenue");

// Add reservation by worker
exports.addReservation = async (req, res) => {
  try {
    const {
      workerId,
      clientId, // optional
      clientName,
      clientPhone,
      title,
      taskDescription,
      billingType,
      hours,
      hourlyRate,
      fixedPrice,
      totalPrice,
      scheduledDate,
      scheduledTime,
      status = "pending",
    } = req.body;

    // Check required fields (clientId is optional)
    if (
      !clientName ||
      !clientPhone ||
      !title ||
      !taskDescription ||
      !billingType ||
      !scheduledDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate billing type
    if (!["hourly", "fixed"].includes(billingType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing type. Must be 'hourly' or 'fixed'",
      });
    }

    // Validate required fields based on billing type
    if (billingType === "hourly" && (!hours || !hourlyRate)) {
      return res.status(400).json({
        success: false,
        message: "hours and hourlyRate are required for hourly billing",
      });
    }

    if (billingType === "fixed" && !fixedPrice) {
      return res.status(400).json({
        success: false,
        message: "fixedPrice is required for fixed billing",
      });
    }

    // Validate workerId
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    // Validate clientId only if provided
    if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    // Check if worker exists
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Optional: check client existence only if clientId provided
    if (clientId) {
      const client = await User.findById(clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found",
        });
      }
    }

    // Prepare reservation data
    const reservationData = {
      worker: workerId,
      client: clientId || undefined,
      clientName,
      clientPhone,
      title,
      taskDescription,
      billingType,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status,
    };

    // Add billing-specific fields
    if (billingType === "hourly") {
      reservationData.hours = hours;
      reservationData.hourlyRate = hourlyRate;
      reservationData.totalPrice = hours * hourlyRate;
    } else {
      reservationData.fixedPrice = fixedPrice;
      reservationData.totalPrice = fixedPrice;
    }

    // Step 1: Create reservation document
    const newReservation = await Reservation.create(reservationData);

    // Step 2: Push reservation ID to worker
    worker.reservations.push(newReservation._id);
    await worker.save();

    // Step 3: Populate if clientId exists
    let populatedReservation;
    if (clientId) {
      populatedReservation = await Reservation.findById(newReservation._id)
        .populate("client", "firstName lastName email phone")
        .populate("worker", "specialization");
    } else {
      populatedReservation = await Reservation.findById(
        newReservation._id
      ).populate("worker", "specialization");
    }

    res.status(201).json({
      success: true,
      message: "Reservation added successfully",
      data: populatedReservation,
    });
  } catch (error) {
    console.error("Error adding reservation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update reservation by worker
exports.updateReservation = async (req, res) => {
  try {
    const { workerId, reservationId } = req.params;
    const updateData = req.body;

    // Validate ObjectId formats
    if (
      !mongoose.Types.ObjectId.isValid(workerId) ||
      !mongoose.Types.ObjectId.isValid(reservationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker or reservation ID",
      });
    }

    // Check if reservation exists and belongs to the worker
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    if (reservation.worker.toString() !== workerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this reservation",
      });
    }

    // Validate billing type if provided
    if (
      updateData.billingType &&
      !["hourly", "fixed"].includes(updateData.billingType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing type. Must be 'hourly' or 'fixed'",
      });
    }

    // Validate required fields based on billing type if changing billing type
    const billingTypeToUse = updateData.billingType || reservation.billingType;

    if (
      updateData.billingType === "hourly" ||
      (billingTypeToUse === "hourly" && updateData.billingType !== "fixed")
    ) {
      if (
        updateData.hours !== undefined &&
        updateData.hourlyRate === undefined &&
        reservation.hourlyRate === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "hourlyRate is required when updating hours for hourly billing",
        });
      }
    }

    if (
      updateData.billingType === "fixed" ||
      (billingTypeToUse === "fixed" && updateData.billingType !== "hourly")
    ) {
      if (
        updateData.fixedPrice === undefined &&
        reservation.fixedPrice === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "fixedPrice is required for fixed billing",
        });
      }
    }

    // Allowed fields to update
    const allowedUpdates = [
      "clientName",
      "clientPhone",
      "title",
      "taskDescription",
      "billingType",
      "hours",
      "hourlyRate",
      "fixedPrice",
      "scheduledDate",
      "scheduledTime",
      "status",
    ];

    // Filter only allowed fields
    const filteredUpdates = {};
    for (let key of allowedUpdates) {
      if (key in updateData) {
        filteredUpdates[key] =
          key === "scheduledDate" ? new Date(updateData[key]) : updateData[key];
      }
    }

    // Recalculate total price if billing-related fields are updated
    if (
      Object.keys(filteredUpdates).some((key) =>
        ["billingType", "hours", "hourlyRate", "fixedPrice"].includes(key)
      )
    ) {
      const finalBillingType =
        filteredUpdates.billingType || reservation.billingType;

      if (finalBillingType === "hourly") {
        const finalHours =
          filteredUpdates.hours !== undefined
            ? filteredUpdates.hours
            : reservation.hours;
        const finalHourlyRate =
          filteredUpdates.hourlyRate !== undefined
            ? filteredUpdates.hourlyRate
            : reservation.hourlyRate;

        if (finalHours !== undefined && finalHourlyRate !== undefined) {
          filteredUpdates.totalPrice = finalHours * finalHourlyRate;
        }
      } else {
        const finalFixedPrice =
          filteredUpdates.fixedPrice !== undefined
            ? filteredUpdates.fixedPrice
            : reservation.fixedPrice;
        if (finalFixedPrice !== undefined) {
          filteredUpdates.totalPrice = finalFixedPrice;
        }
      }
    }

    // Apply the update
    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Reservation updated successfully",
      data: updatedReservation,
    });
  } catch (error) {
    console.error("Error updating reservation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// Get all reservations by worker
exports.getAllReservations = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { status, startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    // Build base query
    const query = { worker: workerId };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    // Query Reservation model directly and populate client details
    const reservations = await Reservation.find(query)
      .sort({ scheduledDate: -1 })
      .populate("client", "firstName lastName phone email");

    res.status(200).json({
      success: true,
      message: "Reservations fetched successfully",
      count: reservations.length,
      data: reservations,
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get single reservation by worker
exports.getReservationById = async (req, res) => {
  try {
    const { workerId, reservationId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(workerId) ||
      !mongoose.Types.ObjectId.isValid(reservationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker or reservation ID",
      });
    }

    // Fetch reservation directly
    const reservation = await Reservation.findOne({
      _id: reservationId,
      worker: workerId,
    }).populate("client", "firstName lastName phone email");

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reservation fetched successfully",
      data: reservation,
    });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete reservation by worker
exports.deleteReservation = async (req, res) => {
  try {
    const { workerId, reservationId } = req.params;

    // Validate ObjectId formats
    if (
      !mongoose.Types.ObjectId.isValid(workerId) ||
      !mongoose.Types.ObjectId.isValid(reservationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker or reservation ID",
      });
    }

    // Check if reservation exists and belongs to the worker
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    if (reservation.worker.toString() !== workerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this reservation",
      });
    }

    // Delete the reservation
    await Reservation.findByIdAndDelete(reservationId);

    return res.status(200).json({
      success: true,
      message: "Reservation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Change reservation status
// @route   PUT /api/reservations/:workerId/:reservationId/status
// @access  Private (Worker)
exports.changeReservationStatus = async (req, res) => {
  try {
    const { workerId, reservationId } = req.params;
    const { status } = req.body; // Expecting { status: "newStatus" } in the request body
    // Validate ObjectId formats
    if (
      !mongoose.Types.ObjectId.isValid(workerId) ||
      !mongoose.Types.ObjectId.isValid(reservationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker or reservation ID",
      });
    }

    // Validate status value
    const validStatuses = [
      "pending",
      "confirmedWithClient",
      "finished",
      "canceled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Check if reservation exists and belongs to the worker
    const reservation = await Reservation.findById(reservationId).populate(
      "worker client"
    );
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    if (reservation.worker._id.toString() !== workerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to change this reservation's status",
      });
    }

    // Check if reservation is already finished
    if (reservation.status === "finished") {
      return res.status(400).json({
        success: false,
        message: "Cannot change status. Reservation is already finished.",
      });
    }

    // Check if trying to change to the same status
    if (reservation.status === status) {
      return res.status(200).json({
        success: true,
        message: `Reservation status is already ${status}`,
        data: reservation,
      });
    }

    // Update the reservation status
    reservation.status = status;
    const updatedReservation = await reservation.save();

    // If status is changed TO 'finished', create revenue automatically
    if (status === "finished") {
      try {
        // Get all advances for this reservation
        const advances = await Revenue.findOne({
          reservation: reservationId,
          status: "advance",
        });
        let totalAdvances = 0;
        if (advances) {
          totalAdvances = advances.amount || 0;
        }
        // Check if a final/full payment revenue already exists
        const existingFinalRevenue = await Revenue.findOne({
          reservation: reservationId,
          status: { $in: ["final", "completed"] },
        });
        if (existingFinalRevenue) {
          // Log warning but don't fail the status update
          console.warn(
            `Final revenue already exists for reservation ${reservationId}`
          );
        } else {
          // Get worker and client user documents for full details
          const workerUser = await User.findById(reservation.worker.user);
          const clientUser = reservation.client
            ? await User.findById(reservation.client)
            : null;

          // Calculate the remaining amount to be paid
          const remainingAmount = reservation.totalPrice - totalAdvances;
          if (remainingAmount > 0) {
            // Prepare revenue data for the remaining payment
            const revenueData = {
              worker: reservation.worker._id,
              client: reservation.client || null,
              reservation: reservation._id,
              amount: remainingAmount,
              status: totalAdvances > 0 ? "final" : "completed",
              paymentDate: new Date(),
              description:
                totalAdvances > 0
                  ? `Final payment for reservation ${reservation._id}`
                  : `Full payment for reservation ${reservation._id}`,
              // SNAPSHOT FIELDS
              clientName: reservation.clientName,
              clientPhone: reservation.clientPhone,
              title: reservation.title,
              taskDescription: reservation.taskDescription,
              billingType: reservation.billingType,
              hours: reservation.hours,
              hourlyRate: reservation.hourlyRate,
              fixedPrice: reservation.fixedPrice,
              totalPrice: reservation.totalPrice,
              reservationStatus: reservation.status,
              scheduledDate: reservation.scheduledDate,
              scheduledTime: reservation.scheduledTime,
              completedAt: new Date(),
            };
            // Create the revenue document
            const newRevenue = new Revenue(revenueData);
            const savedRevenue = await newRevenue.save();
            console.log(
              `Revenue created automatically for finished reservation ${reservationId}: ${savedRevenue._id}`
            );
          } else {
            // No remaining amount to pay, do not create a new revenue
            console.log(
              `No remaining amount to record for reservation ${reservationId}`
            );
          }
        }
      } catch (revenueError) {
        console.error("Error creating revenue automatically:", revenueError);
        // Important: Don't fail the status update if revenue creation fails,
        // but log the error. The status change is the primary action.
        // Consider adding logic to retry or alert admins if revenue creation fails consistently.
      }
    }

    return res.status(200).json({
      success: true,
      message: `Reservation status updated to ${status} successfully`,
      data: updatedReservation,
    });
  } catch (error) {
    console.error("Error changing reservation status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Add an advance (avance) to a reservation
// @route   POST /api/reservations/:workerId/:reservationId/avance
// @access  Private (Worker)
exports.createAvance = async (req, res) => {
  try {
    const { workerId, reservationId } = req.params;
    const { montant } = req.body;

    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(workerId) ||
      !mongoose.Types.ObjectId.isValid(reservationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker or reservation ID",
      });
    }

    // Validate amount
    if (typeof montant !== "number" || montant <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Valid 'montant' (amount) is required and must be greater than 0",
      });
    }

    // Find reservation and ensure it belongs to the worker
    const reservation = await Reservation.findOne({
      _id: reservationId,
      worker: workerId,
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found or not authorized",
      });
    }

    // Optional: Only allow avance if status is confirmedWithClient or finished
    /*  if (reservation.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot add advance: Reservation is still pending",
      });
    }
 */
    if (reservation.status === "canceled") {
      return res.status(400).json({
        success: false,
        message: "Cannot add advance: Reservation is canceled",
      });
    }

    // Optional: Prevent overpayment
    const totalAvances = reservation.avances.reduce(
      (sum, a) => sum + a.montant,
      0
    );
    if (totalAvances + montant > reservation.totalPrice) {
      return res.status(400).json({
        success: false,
        message: `Advance exceeds total price. Maximum allowed: ${
          reservation.totalPrice - totalAvances
        }`,
      });
    }

    // Add the new avance
    const avanceDate = new Date();
    reservation.avances.push({
      montant: montant,
      date: avanceDate,
    });

    // Save updated reservation
    const updatedReservation = await reservation.save();

    // Create or update a Revenue entry for this advance
    try {
      // Try to find an existing advance revenue for this reservation
      const existingAdvanceRevenue = await Revenue.findOne({
        reservation: reservation._id,
        status: "advance",
      });
      if (existingAdvanceRevenue) {
        // Update the amount (add the new advance)
        existingAdvanceRevenue.amount += montant;
        existingAdvanceRevenue.paymentDate = avanceDate; // update to latest advance date
        existingAdvanceRevenue.description = `Advance payment for reservation ${reservation._id}`;
        await existingAdvanceRevenue.save();
      } else {
        // Create a new advance revenue
        await Revenue.create({
          worker: reservation.worker,
          client: reservation.client || null,
          reservation: reservation._id,
          amount: montant,
          status: "advance",
          paymentDate: avanceDate,
          description: `Advance payment for reservation ${reservation._id}`,
          // SNAPSHOT FIELDS
          clientName: reservation.clientName,
          clientPhone: reservation.clientPhone,
          title: reservation.title,
          taskDescription: reservation.taskDescription,
          billingType: reservation.billingType,
          hours: reservation.hours,
          hourlyRate: reservation.hourlyRate,
          fixedPrice: reservation.fixedPrice,
          totalPrice: reservation.totalPrice,
          reservationStatus: reservation.status,
          scheduledDate: reservation.scheduledDate,
          scheduledTime: reservation.scheduledTime,
          completedAt:
            reservation.status === "finished" ? new Date() : undefined,
        });
      }
    } catch (revenueError) {
      console.error(
        "Error creating/updating Revenue for advance:",
        revenueError
      );
      // Optionally: return error or just log
    }

    res.status(200).json({
      success: true,
      message: "Advance added successfully",
      data: updatedReservation,
    });
  } catch (error) {
    console.error("Error adding advance:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
