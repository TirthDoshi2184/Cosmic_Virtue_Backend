const ProductController = require('../controllers/ProductController');
const express = require('express');
const router = express.Router();

// Route to create a new product
router.post('/', ProductController.createProduct);

// Route to create multiple products
router.post('/bulk', ProductController.createmultipleProducts);

// Route to get all products
router.get('/', ProductController.getAllProducts);

// Route to get a product by ID
router.get('/:id', ProductController.getProductbyId);

// Route to update a product by ID
router.put('/:id', ProductController.updateProduct);

// Route to delete a product by ID
router.delete('/:id', ProductController.deleteProduct); 

module.exports = router;
