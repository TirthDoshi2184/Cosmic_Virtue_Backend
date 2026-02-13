const CategorySchema = require('../models/CategoryModel');

// Create new category
const createCategory = async (req, res) => {
    try {
        const { name, howtoUse, imageUrl } = req.body;
        
        const category = new CategorySchema({
            name,
            howtoUse,
            imageUrl
        });
        await category.save();
        res.status(201).json({
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all categories
const getAllCategories = async (req, res) => {
    try {
        const categories = await CategorySchema.find();
        res.status(200).json({
            data: categories,
            message: "Successfully got all the Categories"
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Error fetching categories",
            error: error.message
        });
    }
};
// Add this to your CategoryController
const createMultipleCategories = async (req, res) => {
    try {
        const { categories } = req.body; // expects array of category objects
        
        if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({ 
                error: 'Please provide an array of categories' 
            });
        }
        
        const createdCategories = await CategorySchema.insertMany(categories);
        
        res.status(201).json({
            message: `${createdCategories.length} categories created successfully`,
            data: createdCategories
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createCategory,
    createMultipleCategories,
    getAllCategories
};