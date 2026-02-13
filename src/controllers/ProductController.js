const ProductSchema = require('../models/ProductModel');

// Create new product
const createProduct = async (req, res) => {
    try {
        const { name, price, description, fragnance, category, ingredients, dimension, keyFeatures, img } = req.body;
        
        const product = new ProductSchema({
            name,
            price,
            description,
            fragnance,
            category,
            ingredients,
            dimension,
            keyFeatures,
            img
        });
        await product.save();
        
        res.status(201).json({
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all products
const getAllProducts = async (req, res) => {
    try {
        const products = await ProductSchema.find().populate('category');
        res.status(200).json({
            data: products,
            message: "Successfully got all the Products"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching products",
            error: error.message
        });
    }
};

const getProductbyId = async (req, res) => {
    try {
        const product = await ProductSchema.findById(req.params.id).populate('category');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({
            data: product,
            message: "Successfully got the Product"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching product",
            error: error.message
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;
        const updatedProduct = await ProductSchema.findByIdAndUpdate(id, updates, { new: true });
        
        if (updatedProduct) {   
            res.status(200).json({
                data: updatedProduct,
                message: 'Product updated successfully'
            });
        } else {
            res.status(404).json({
                message: 'No such product found to update'
            });
        }   
    } catch (error) {
        res.status(500).json({
            message: "Error updating product",
            error: error.message
        });
    }   
};

const deleteProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const deletedProduct = await ProductSchema.findByIdAndDelete(id);   
        if (deletedProduct) {
            res.status(200).json({
                data: deletedProduct,
                message: 'Product deleted successfully'
            });
        } else {
            res.status(404).json({
                message: 'No such product found'
            });
        }
    } catch (error) {
        res.status(500).json({
            message: "Error deleting product",
            error: error.message
        });
    }   
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductbyId,
    updateProduct,
    deleteProduct
};

