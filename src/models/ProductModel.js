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

// ── INDEXES FOR FASTER QUERIES ──────────────────────────────────────────────

// Speeds up filtering by category + price range (most common query pattern)
ProductSchema.index({ category: 1, price: 1 });

// Speeds up sorting by newest arrivals and best sellers
ProductSchema.index({ isBestSeller: -1, createdAt: -1 });
ProductSchema.index({ isNewArrival: -1, createdAt: -1 });

// Speeds up text search on name, description, fragrance
ProductSchema.index(
    { name: 'text', description: 'text', fragnance: 'text' },
    { weights: { name: 10, fragnance: 5, description: 1 } } // name matches ranked highest
);

// ────────────────────────────────────────────────────────────────────────────

module.exports = mongoose.model('Product', ProductSchema);