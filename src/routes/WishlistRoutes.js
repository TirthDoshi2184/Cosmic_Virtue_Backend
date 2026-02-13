const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
  mergeGuestWishlist,
} = require("../controllers/WishlistController");


/*
========================================
WISHLIST ROUTES
Base: /api/wishlist
========================================
*/

// Add item
router.post("/add", auth, addToWishlist);

// Get wishlist
router.get("/", auth, getWishlist);

// Remove item
router.delete("/remove/:id", auth, removeFromWishlist);

// Clear wishlist
router.delete("/clear", auth, clearWishlist);

// Merge guest wishlist
router.post('/merge', auth, mergeGuestWishlist);


module.exports = router;
