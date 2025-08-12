const Service = require("../models/Service");
const Worker = require("../models/Worker");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Updated methods for the service controller to work with the new upload middleware

/**
 * Create a new service with optional images/videos
 * @route POST /api/services
 * @access Private (Workers only)
 */
exports.createService = async (req, res) => {
  try {
    console.log("========= we call the create service");
    // Check if user is a worker
    const worker = await Worker.findOne({ user: req.user.id });
    if (!worker) {
      return res.status(403).json({
        success: false,
        message: "Only workers can create services",
      });
    }
    // Prepare service data
    const { title, description, price, category, audience, location } =
      req.body;
    console.log(req.body);
    // Create service object
    const serviceData = {
      title,
      description,
      price,
      worker: worker._id,
      category,
      audience: audience || "public",
      images: [],
      videos: [],
      location,
    };
    console.log(serviceData);
    // Add image paths if images were uploaded
    if (req.body.uploadedImages && req.body.uploadedImages.length > 0) {
      serviceData.images = req.body.uploadedImages;
    }

    // Add video paths if videos were uploaded
    if (req.body.uploadedVideos && req.body.uploadedVideos.length > 0) {
      serviceData.videos = req.body.uploadedVideos;
    }

    // Create and save the service
    const service = new Service(serviceData);
    console.log(service);
    await service.save();

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create service",
      error: error.message,
    });
  }
};

/**
 * Update service details
 * @route PUT /api/services/:id
 * @access Private (Service owner only)
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, audience } = req.body;

    // Find service and verify ownership
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Get worker info to check ownership
    const worker = await Worker.findById(service.worker);
    if (!worker || worker.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this service",
      });
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = price;
    if (category) updateData.category = category;
    if (audience && ["public", "private"].includes(audience)) {
      updateData.audience = audience;
    }

    // Handle image updates
    let currentImages = [...service.images];

    // Parse removeImages if it's a string (from FormData)
    let removeImages = [];
    if (req.body.removeImages) {
      try {
        if (typeof req.body.removeImages === "string") {
          removeImages = JSON.parse(req.body.removeImages);
        } else if (Array.isArray(req.body.removeImages)) {
          removeImages = req.body.removeImages;
        }
      } catch (error) {
        console.error("Error parsing removeImages:", error);
      }
    }

    // Remove images if specified
    if (removeImages && removeImages.length > 0) {
      // Delete files from server
      removeImages.forEach((imagePath) => {
        const fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ""));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });

      // Filter out removed images
      currentImages = currentImages.filter(
        (img) => !removeImages.includes(img)
      );
    }

    // Add new images
    if (req.body.newUploadedImages && req.body.newUploadedImages.length > 0) {
      // Handle if it's a string (single image)
      if (typeof req.body.newUploadedImages === "string") {
        currentImages.push(req.body.newUploadedImages);
      } else {
        // Handle if it's an array
        currentImages = [...currentImages, ...req.body.newUploadedImages];
      }
    }

    updateData.images = currentImages;

    // Handle video updates
    let currentVideos = [...service.videos];

    // Parse removeVideos if it's a string (from FormData)
    let removeVideos = [];
    if (req.body.removeVideos) {
      try {
        if (typeof req.body.removeVideos === "string") {
          removeVideos = JSON.parse(req.body.removeVideos);
        } else if (Array.isArray(req.body.removeVideos)) {
          removeVideos = req.body.removeVideos;
        }
      } catch (error) {
        console.error("Error parsing removeVideos:", error);
      }
    }

    // Remove videos if specified
    if (removeVideos && removeVideos.length > 0) {
      // Delete files from server
      removeVideos.forEach((videoPath) => {
        const fullPath = path.join(process.cwd(), videoPath.replace(/^\//, ""));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });

      // Filter out removed videos
      currentVideos = currentVideos.filter(
        (vid) => !removeVideos.includes(vid)
      );
    }

    // Add new videos
    if (req.body.newUploadedVideos && req.body.newUploadedVideos.length > 0) {
      // Handle if it's a string (single video)
      if (typeof req.body.newUploadedVideos === "string") {
        currentVideos.push(req.body.newUploadedVideos);
      } else {
        // Handle if it's an array
        currentVideos = [...currentVideos, ...req.body.newUploadedVideos];
      }
    }

    updateData.videos = currentVideos;

    // Update the service
    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};

/**
 * Change service audience (public/private)
 * @route PATCH /api/services/:id/audience
 * @access Private (Service owner only)
 */
exports.changeServiceAudience = async (req, res) => {
  try {
    const { id } = req.params;
    const { audience } = req.body;

    // Validate audience value
    if (!audience || !["public", "private"].includes(audience)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audience value. Must be 'public' or 'private'",
      });
    }

    // Find service and verify ownership
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Get worker info to check ownership
    const worker = await Worker.findById(service.worker);
    if (!worker || worker.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this service",
      });
    }

    // Update the service audience
    service.audience = audience;
    await service.save();

    res.status(200).json({
      success: true,
      message: `Service is now ${audience}`,
      data: service,
    });
  } catch (error) {
    console.error("Error changing service audience:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change service audience",
      error: error.message,
    });
  }
};

/**
 * Get all services of logged-in user (worker)
 * @route GET /api/services/my-services
 * @access Private
 */
exports.getMyServices = async (req, res) => {
  try {
    // Find worker associated with the logged-in user
    const worker = await Worker.findOne({ user: req.user.id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    // Get all services for this worker
    const services = await Service.find({ worker: worker._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Error fetching my services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

/**
 * Get all public services
 * @route GET /api/services
 * @access Public
 */
exports.getAllServices = async (req, res) => {
  try {
    // Default pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter for public services only
    const filter = { audience: "public" };

    // Optional category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Count total matching services for pagination info
    const total = await Service.countDocuments(filter);

    // Fetch services with pagination
    const services = await Service.find(filter)
      .populate({
        path: "worker",
        select: "specialization experience availability",
        populate: {
          path: "user",
          select: "firstName lastName profileImage",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: services.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: services,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};

/**
 * Search services
 * @route GET /api/services/search
 * @access Public
 */
exports.searchServices = async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline = [];
    // Only public services
    pipeline.push({ $match: { audience: "public" } });

    // Category filter
    if (category) {
      pipeline.push({ $match: { category } });
    }

    // Price filter
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);
      pipeline.push({ $match: { price: priceFilter } });
    }

    // Join with Worker and User
    pipeline.push(
      {
        $lookup: {
          from: "workers",
          localField: "worker",
          foreignField: "_id",
          as: "workerObj",
        },
      },
      { $unwind: "$workerObj" },
      {
        $lookup: {
          from: "users",
          localField: "workerObj.user",
          foreignField: "_id",
          as: "userObj",
        },
      },
      { $unwind: "$userObj" }
    );

    // Elastic search by query (title, description, worker name, case-insensitive, substring, ignore diacritics)
    if (query) {
      // Remove diacritics for more elastic search
      const removeDiacritics = (str) =>
        str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      const safeQuery = removeDiacritics(query);
      const regex = new RegExp(safeQuery, "i");
      pipeline.push({
        $addFields: {
          titleNoDiacritics: {
            $replaceAll: {
              input: { $toLower: { $ifNull: ["$title", ""] } },
              find: "é",
              replacement: "e",
            },
          },
          descriptionNoDiacritics: {
            $replaceAll: {
              input: { $toLower: { $ifNull: ["$description", ""] } },
              find: "é",
              replacement: "e",
            },
          },
          firstNameNoDiacritics: {
            $replaceAll: {
              input: { $toLower: { $ifNull: ["$userObj.firstName", ""] } },
              find: "é",
              replacement: "e",
            },
          },
          lastNameNoDiacritics: {
            $replaceAll: {
              input: { $toLower: { $ifNull: ["$userObj.lastName", ""] } },
              find: "é",
              replacement: "e",
            },
          },
        },
      });
      pipeline.push({
        $match: {
          $or: [
            { titleNoDiacritics: { $regex: regex } },
            { descriptionNoDiacritics: { $regex: regex } },
            { firstNameNoDiacritics: { $regex: regex } },
            { lastNameNoDiacritics: { $regex: regex } },
          ],
        },
      });
    }

    // Count total results
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Service.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Pagination and sorting
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Project fields and re-populate worker/user for response
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        price: 1,
        category: 1,
        images: 1,
        videos: 1,
        audience: 1,
        location: 1,
        createdAt: 1,
        updatedAt: 1,
        worker: {
          _id: "$workerObj._id",
          specialization: "$workerObj.specialization",
          experience: "$workerObj.experience",
          availability: "$workerObj.availability",
          user: {
            _id: "$userObj._id",
            firstName: "$userObj.firstName",
            lastName: "$userObj.lastName",
            profileImage: "$userObj.profileImage",
          },
        },
      },
    });

    const services = await Service.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: services.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: services,
    });
  } catch (error) {
    console.error("Error searching services:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search services",
      error: error.message,
    });
  }
};

/**
 * Get service by ID
 * @route GET /api/services/:id
 * @access Public (with visibility control)
 */
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find service with detailed worker info
    const service = await Service.findById(id).populate({
      path: "worker",
      select: "specialization experience availability skills",
      populate: {
        path: "user",
        select: "firstName lastName profileImage email phone adress",
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Check if private service is being accessed by its owner
    if (service.audience === "private") {
      // If user is not logged in, deny access
      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: "This service is private",
        });
      }

      // Get worker info to check ownership
      const worker = await Worker.findById(service.worker);
      if (!worker || worker.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "This service is private",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service",
      error: error.message,
    });
  }
};

/**
 * Delete service
 * @route DELETE /api/services/:id
 * @access Private (Service owner only)
 */
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Find service and verify ownership
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Get worker info to check ownership
    const worker = await Worker.findById(service.worker);
    if (!worker || worker.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this service",
      });
    }

    // Delete associated images files from the server
    service.images.forEach((imagePath) => {
      // Convert relative path to absolute path
      const fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ""));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    // Delete the service from database
    await Service.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};
