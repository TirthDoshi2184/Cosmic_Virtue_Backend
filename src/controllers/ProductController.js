const ProductSchema = require('../models/ProductModel');
// Add this at the top of ProductController.js
const Category = require('../models/CategoryModel');

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

const createmultipleProducts = async (req, res) => {
    try {
        const { products } = req.body; // expects array of product objects
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ 
                error: 'Please provide an array of products' 
            });
        }
        const createdProducts = await ProductSchema.insertMany(products);
        res.status(201).json({
            message: `${createdProducts.length} products created successfully`,
            data: createdProducts
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Get all products
const getAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            order = 'desc',
            search
        } = req.query;

        // Build filter object
        const filter = {};

        if (category && category !== 'all') {
            // Support filtering by category name via populated field
            const categoryDoc = await Category.findOne({ 
                name: new RegExp(category, 'i') 
            });
            if (categoryDoc) filter.category = categoryDoc._id;
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        if (search) {
            filter.$or = [
                { name: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { fragnance: new RegExp(search, 'i') }
            ];
        }

        // Sort map
        const sortMap = {
            'price-low':  { price: 1 },
            'price-high': { price: -1 },
            'rating':     { rating: -1 },
            'featured':   { trending: -1, createdAt: -1 },
        };
        const sort = sortMap[sortBy] || { createdAt: -1 };

        const skip = (Number(page) - 1) * Number(limit);

        // Run query + count in parallel
        const [products, total] = await Promise.all([
            ProductSchema.find(filter)
                .populate('category', 'name')   // only fetch name field
                .select('-__v -keyFeatures -ingredients') // drop heavy unused fields
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .lean(),                        // plain JS object, faster than Mongoose docs
            ProductSchema.countDocuments(filter)
        ]);

        res.status(200).json({
            data: products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            },
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

const getNewArrivals = async (req, res) => {
    try {
        const products = await ProductSchema.find({ isNewArrival: true })
            .populate('category', 'name')
            .select('name price img isNewArrival isBestSeller category rating dimension salePercentage')
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();

        res.status(200).json({ data: products, message: "Successfully got new arrivals" });
    } catch (error) {
        res.status(500).json({ message: "Error fetching new arrivals", error: error.message });
    }
};

const getBestSellers = async (req, res) => {
    try {
        const products = await ProductSchema.find({ isBestSeller: true })
            .populate('category', 'name')
            .select('name price img isNewArrival isBestSeller category rating dimension salePercentage')
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();

        res.status(200).json({ data: products, message: "Successfully got best sellers" });
    } catch (error) {
        res.status(500).json({ message: "Error fetching best sellers", error: error.message });
    }
};

module.exports = {
    createProduct,
    getAllProducts,
    getProductbyId,
    updateProduct,
    deleteProduct,
    createmultipleProducts,
    getNewArrivals,
    getBestSellers
};

