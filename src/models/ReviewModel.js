const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new mongoose.Schema({
        product: {
        ref: 'Product',
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    email: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Review', ReviewSchema);