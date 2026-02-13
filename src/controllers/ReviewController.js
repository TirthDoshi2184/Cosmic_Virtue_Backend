const ReviewModel = require('../models/ReviewModel');

// Create new review
const createReview = async (req, res) => {
    try {
        const { productId, email, rating, comment } = req.body;
        const review = new ReviewModel({
            product: productId,
            email,
            rating,
            comment
        });
        await review.save();    
        res.status(201).json({
            message: 'Review created successfully',
            data: review
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all reviews for a product
const getReviewsByProduct = async (req, res) => {
    try {
        const reviews = await ReviewModel.find({ product: req.params.productId });
        res.status(200).json({
            data: reviews,
            message: "Successfully got all the Reviews for the product"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching reviews",
            error: error.message
        });
    }   
};

module.exports = {
    createReview,
    getReviewsByProduct
};