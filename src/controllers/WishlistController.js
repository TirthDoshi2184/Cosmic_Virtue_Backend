const Wishlist = require("../models/WishlistModel");
const Product = require("../models/ProductModel");


/*
========================================
ADD TO WISHLIST
- prevents duplicates
========================================
*/
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body; // ← Only get productId from frontend

    // Fetch product details from database
    const product = await Product.findById(productId).populate('category');
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    const exists = wishlist.items.find(
      (item) => item.productId.toString() === productId
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Item already in wishlist",
      });
    }

    wishlist.items.push({
      productId,
      name: product.name,        // ← Get from product
      price: product.price,      // ← Get from product
      image: product.img,        // ← Get from product
      category: product.category._id, // ← Get from product
    });

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Added to wishlist",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
========================================
GET WISHLIST
========================================
*/
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ userId }).populate(
      "items.category"
    );

    res.status(200).json({
      success: true,
      wishlist: wishlist || { items: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
========================================
REMOVE ITEM
========================================
*/
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.id; // ← Match route paramete

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Removed from wishlist",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
========================================
CLEAR WISHLIST
========================================
*/
exports.clearWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Wishlist cleared",
      wishlist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.mergeGuestWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { items } = req.body; // ← Expect array of items from frontend
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = await Wishlist.create({ userId, items: [] });
        }
        // Merge items, avoiding duplicates
        items.forEach((guestItem) => {
            if (!wishlist.items.some(item => item.productId.toString() === guestItem.productId)) {
                wishlist.items.push(guestItem);
            }
        });

        await wishlist.save();  
        res.status(200).json({
            success: true,
            message: "Guest wishlist merged",
            wishlist,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};