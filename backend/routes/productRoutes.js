const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getCuratedCollections,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getProducts);
router.get('/curated/collections', getCuratedCollections);
router.get('/:id', getProductById);

// Protected Admin routes
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
