const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ProductSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    description: {
        type: String,
        trim: true,
    },
    fragnance: {
        type: String,
        trim: true,
        required: true,
    },
    category:{
        ref: 'Category',
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    ingredients: {
        type: [String],
        default: []
    },
    dimension:{
        height: { type: Number, required: true },
        weight: { type: Number, required: true },
    },
    keyFeatures: {
        type: [String],
        default: []
    },
    img:{
        type: [String],
        // required: true,
    },
    isNewArrival: {
        type: Boolean,
        default: false,
    },
    isBestSeller: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
