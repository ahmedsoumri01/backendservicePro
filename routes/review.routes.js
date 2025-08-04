const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Create a new review (authenticated users only)
router.post('/', authMiddleware, reviewController.createReview);//

// Get all reviews for a specific service
router.get('/service/:serviceId', reviewController.getServiceReviews);//

// Get all reviews for a specific worker
router.get('/worker/:workerId', reviewController.getWorkerReviews);

// Get reviews made by the logged-in user
router.get('/my-reviews', authMiddleware, reviewController.getMyReviews);

// Get random reviews for homepage
router.get('/random', reviewController.getRandomReviews);

// Update a review (review owner only)
router.put('/:id', authMiddleware, reviewController.updateReview);//

// Delete a review (review owner or admin only)
router.delete('/:id', authMiddleware, reviewController.deleteReview);//

// Get all reviews (admin only)
router.get('/', authMiddleware, reviewController.getAllReviews);

module.exports = router;
