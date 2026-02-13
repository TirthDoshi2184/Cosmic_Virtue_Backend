const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeGuestCart,
} = require("../controllers/CartController");


/*
========================================
CART ROUTES
Base: /api/cart
========================================
*/

// Add to cart
router.post("/add", auth, addToCart);

// Get cart
router.get("/", auth, getCart);

// Update quantity
router.put("/update/:id", auth, updateCartItem);

// Remove item
router.delete("/remove/:id", auth, removeFromCart);

// Clear cart
router.delete("/clear", auth, clearCart);

// Merge guest cart on login
router.post('/merge', auth, mergeGuestCart);


module.exports = router;
