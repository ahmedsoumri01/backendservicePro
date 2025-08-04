const Review = require('../models/Review');
const Service = require('../models/Service');
const Worker = require('../models/Worker');
const mongoose = require('mongoose');

/**
 * Create a new review for a service
 * @route POST /api/reviews
 * @access Private (Authenticated users only)
 */
exports.createReview = async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;

    // Validate required fields
    if (!serviceId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and rating are required',
      });
    }

    // Validate rating is between 1 and 5
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Get worker info from service
    const worker = await Worker.findById(service.worker);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found',
      });
    }

    // Check if user has already reviewed this service
    const existingReview = await Review.findOne({
      user: req.user.id,
      service: serviceId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this service',
      });
    }

    // Create new review
    const review = new Review({
      user: req.user.id,
      worker: worker._id,
      service: serviceId,
      rating,
      comment: comment || '',
    });

    await review.save();

    // Return the new review with populated user data
    const populatedReview = await Review.findById(review._id)
      .populate('user', 'firstName lastName profileImage')
      .populate('service', 'title');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: populatedReview,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: error.message,
    });
  }
};

/**
 * Get all reviews for a specific service
 * @route GET /api/reviews/service/:serviceId
 * @access Public
 */
exports.getServiceReviews = async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Get all reviews for this service
    const reviews = await Review.find({ service: serviceId })
      .populate('user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching service reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

/**
 * Get all reviews for a specific worker
 * @route GET /api/reviews/worker/:workerId
 * @access Public
 */
exports.getWorkerReviews = async (req, res) => {
  try {
    const { workerId } = req.params;

    // Check if worker exists
    const worker = await Worker.findById(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found',
      });
    }

    // Get all reviews for this worker
    const reviews = await Review.find({ worker: workerId })
      .populate('user', 'firstName lastName profileImage')
      .populate('service', 'title')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching worker reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

/**
 * Get reviews made by the logged-in user
 * @route GET /api/reviews/my-reviews
 * @access Private
 */
exports.getMyReviews = async (req, res) => {
  try {
    // Get all reviews made by this user
    const reviews = await Review.find({ user: req.user.id })
      .populate('service', 'title')
      .populate({
        path: 'worker',
        select: 'specialization',
        populate: {
          path: 'user',
          select: 'firstName lastName profileImage',
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

/**
 * Update a review
 * @route PUT /api/reviews/:id
 * @access Private (Review owner only)
 */
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Find review and verify ownership
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user owns this review
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this review",
      });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Update review
    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    // Return updated review with populated data
    const updatedReview = await Review.findById(id)
      .populate('user', 'firstName lastName profileImage')
      .populate('service', 'title');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message,
    });
  }
};

/**
 * Delete a review
 * @route DELETE /api/reviews/:id
 * @access Private (Review owner or Admin)
 */
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Find review
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Check if user owns this review or is an admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this review",
      });
    }

    // Delete the review
    await Review.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message,
    });
  }
};

/**
 * Get random reviews for homepage
 * @route GET /api/reviews/random
 * @access Public
 */
exports.getRandomReviews = async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 5;
    
    // Get random reviews with rating >= 4 for better homepage display
    const reviews = await Review.aggregate([
      { $match: { rating: { $gte: 4 } } },
      { $sample: { size: count } },
      { $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $lookup: {
          from: 'services',
          localField: 'service',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      { $lookup: {
          from: 'workers',
          localField: 'worker',
          foreignField: '_id',
          as: 'worker'
        }
      },
      { $unwind: '$worker' },
      { $lookup: {
          from: 'users',
          localField: 'worker.user',
          foreignField: '_id',
          as: 'workerUser'
        }
      },
      { $unwind: '$workerUser' },
      { $project: {
          _id: 1,
          rating: 1,
          comment: 1,
          createdAt: 1,
          'user._id': 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.profileImage': 1,
          'service._id': 1,
          'service.title': 1,
          'worker._id': 1,
          'worker.specialization': 1,
          'workerUser._id': 1,
          'workerUser.firstName': 1,
          'workerUser.lastName': 1,
          'workerUser.profileImage': 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching random reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch random reviews',
      error: error.message,
    });
  }
};

/**
 * Get all reviews (admin only)
 * @route GET /api/reviews
 * @access Private (Admin only)
 */
exports.getAllReviews = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Count total reviews
    const total = await Review.countDocuments();

    // Get reviews with pagination
    const reviews = await Review.find()
      .populate('user', 'firstName lastName email profileImage')
      .populate('service', 'title')
      .populate({
        path: 'worker',
        select: 'specialization',
        populate: {
          path: 'user',
          select: 'firstName lastName',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: reviews.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};
