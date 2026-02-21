const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { validateCategory } = require('../middleware/validation');

router.get('/', categoryController.getAllCategories);
router.post('/', validateCategory, categoryController.createCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;