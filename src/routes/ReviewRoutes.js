const ReviewController = require('../controllers/ReviewController');
const express = require('express');
const router = express.Router();

// Route to create a new review
router.post('/', ReviewController.createReview);
// Route to get all reviews for a product
router.get('/product/:productId', ReviewController.getReviewsByProduct);

module.exports = router;