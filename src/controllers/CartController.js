const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");

/*
========================================
ADD TO CART
- if product exists → increment quantity
- else → push new item
========================================
*/
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body; // ← Only get these from frontend

    // Fetch product details from database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.price,           // ← Get from product
        name: product.name,              // ← Get from product
        image: product.img,              // ← Get from product
        size: product.dimension ? `${product.dimension.height}cm` : 'Standard', // ← Get from product
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/*
========================================
GET CART
========================================
*/
exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    res.status(200).json({
      success: true,
      cart: cart || { items: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
========================================
UPDATE QUANTITY
========================================
*/
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
const productId = req.params.id;  // ← Get from URL params
const { quantity } = req.body;
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(
      (i) => i.productId.toString() === productId
    );

    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity = quantity;

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
========================================
REMOVE SINGLE ITEM
========================================
*/
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.id; // ← Match route parameter

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Item removed",
      cart,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/*
========================================
CLEAR CART
========================================
*/
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Cart cleared",
      cart,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.mergeGuestCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items } = req.body; // Array of guest cart items

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Loop through guest items and merge
    for (const guestItem of items) {
      const product = await Product.findById(guestItem.productId);
      if (!product) continue;

      const existingItem = cart.items.find(
        (item) => item.productId.toString() === guestItem.productId
      );

      if (existingItem) {
        existingItem.quantity += guestItem.quantity;
      } else {
        cart.items.push({
          productId: guestItem.productId,
          quantity: guestItem.quantity,
          price: product.price,
          name: product.name,
          image: product.img,
          size: guestItem.size || 'Standard'
        });
      }
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Guest cart merged successfully",
      cart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};