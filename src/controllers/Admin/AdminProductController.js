const Product = require('../../models/ProductModel');
const Category = require('../../models/CategoryModel');

// ============================================
// CREATE PRODUCT
// POST /api/admin/products
// ============================================
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      fragnance,
      category,
      ingredients,
      dimension,
      keyFeatures,
      img,
      isNewArrival,
      isBestSeller,
      salePercentage,
    } = req.body;

    // Validate required fields
    if (!name || !price || !fragnance || !category) {
      return res.status(400).json({
        success: false,
        message: 'name, price, fragnance, and category are required.',
      });
    }

    if (!dimension?.height || !dimension?.weight) {
      return res.status(400).json({
        success: false,
        message: 'dimension.height and dimension.weight are required.',
      });
    }

    // Verify category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: 'Category not found. Please provide a valid category ID.',
      });
    }

    const product = await Product.create({
      name,
      price,
      description,
      fragnance,
      category,
      ingredients: ingredients || [],
      dimension,
      keyFeatures: keyFeatures || [],
      img: img || [],
      isNewArrival: isNewArrival || false,
      isBestSeller: isBestSeller || false,
      salePercentage: salePercentage || 0,
    });

    const populated = await product.populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: populated,
    });
  } catch (error) {
    console.error('Admin createProduct error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product.',
      error: error.message,
    });
  }
};

// ============================================
// BULK CREATE PRODUCTS
// POST /api/admin/products/bulk
// ============================================
exports.bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide a non-empty array of products.',
      });
    }

    const created = await Product.insertMany(products, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${created.length} products created successfully.`,
      data: created,
    });
  } catch (error) {
    console.error('Admin bulkCreateProducts error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk product creation failed.',
      error: error.message,
    });
  }
};

// ============================================
// GET ALL PRODUCTS (admin view — includes all fields)
// GET /api/admin/products
// Query: page, limit, category, minPrice, maxPrice,
//        search, sortBy, order, isNewArrival, isBestSeller
// ============================================
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      isNewArrival,
      isBestSeller,
    } = req.query;

    const filter = {};

    if (category && category !== 'all') {
      const catDoc = await Category.findOne({ name: new RegExp(category, 'i') });
      if (catDoc) filter.category = catDoc._id;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (isNewArrival !== undefined) filter.isNewArrival = isNewArrival === 'true';
    if (isBestSeller !== undefined) filter.isBestSeller = isBestSeller === 'true';

    if (search) {
      filter.$or = [
        { name:        new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { fragnance:   new RegExp(search, 'i') },
      ];
    }

    const sortMap = {
      'price-low':  { price: 1 },
      'price-high': { price: -1 },
      'newest':     { createdAt: -1 },
      'oldest':     { createdAt: 1 },
      'name':       { name: 1 },
    };
    const sort = sortMap[sortBy] || { [sortBy]: order === 'asc' ? 1 : -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (error) {
    console.error('Admin getAllProducts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products.',
      error: error.message,
    });
  }
};

// ============================================
// GET SINGLE PRODUCT
// GET /api/admin/products/:id
// ============================================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error('Admin getProductById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product.',
      error: error.message,
    });
  }
};

// ============================================
// UPDATE PRODUCT
// PATCH /api/admin/products/:id
// Supports partial updates — only send the fields you want to change
// ============================================
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent accidental overwrite of _id
    delete updates._id;
    delete updates.__v;

    // If category is being changed, validate it
    if (updates.category) {
      const catDoc = await Category.findById(updates.category);
      if (!catDoc) {
        return res.status(400).json({
          success: false,
          message: 'Category not found. Please provide a valid category ID.',
        });
      }
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: product,
    });
  } catch (error) {
    console.error('Admin updateProduct error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product.',
      error: error.message,
    });
  }
};

// ============================================
// DELETE PRODUCT
// DELETE /api/admin/products/:id
// ============================================
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
      data: { id: product._id, name: product.name },
    });
  } catch (error) {
    console.error('Admin deleteProduct error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product.',
      error: error.message,
    });
  }
};

// ============================================
// BULK DELETE PRODUCTS
// DELETE /api/admin/products/bulk
// Body: { ids: ['id1', 'id2', ...] }
// ============================================
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide a non-empty array of product IDs.',
      });
    }

    const result = await Product.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} product(s) deleted.`,
    });
  } catch (error) {
    console.error('Admin bulkDeleteProducts error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk delete failed.',
      error: error.message,
    });
  }
};

// ============================================
// TOGGLE PRODUCT FLAG  (newArrival / bestSeller)
// PATCH /api/admin/products/:id/toggle
// Body: { field: 'isNewArrival' | 'isBestSeller' }
// ============================================
exports.toggleProductFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body;

    const allowedFlags = ['isNewArrival', 'isBestSeller'];
    if (!allowedFlags.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `field must be one of: ${allowedFlags.join(', ')}`,
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product[field] = !product[field];
    await product.save();

    res.status(200).json({
      success: true,
      message: `${field} toggled to ${product[field]}.`,
      data: { id: product._id, [field]: product[field] },
    });
  } catch (error) {
    console.error('Admin toggleProductFlag error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle flag.',
      error: error.message,
    });
  }
};

// ============================================
// PRODUCT STATS (inventory overview)
// GET /api/admin/products/stats
// ============================================
exports.getProductStats = async (req, res) => {
  try {
    const [stats] = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts:    { $sum: 1 },
          avgPrice:         { $avg: '$price' },
          minPrice:         { $min: '$price' },
          maxPrice:         { $max: '$price' },
          newArrivalsCount: { $sum: { $cond: ['$isNewArrival', 1, 0] } },
          bestSellersCount: { $sum: { $cond: ['$isBestSeller', 1, 0] } },
        },
      },
    ]);

    // Products per category
    const byCategory = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$categoryInfo.name',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats || {},
        byCategory,
      },
    });
  } catch (error) {
    console.error('Admin getProductStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product stats.',
      error: error.message,
    });
  }
};