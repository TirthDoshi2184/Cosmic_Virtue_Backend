const CategoryController = require('../controllers/CategoryController');
const express = require('express');
const router = express.Router();

// Route to create a new category
router.post('/', CategoryController.createCategory);
// Route to get all categories
router.get('/', CategoryController.getAllCategories); 

// Route to create multiple categories at once
router.post('/bulk', CategoryController.createMultipleCategories);
module.exports = router;
