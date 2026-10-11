const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc Get all active categories with product count
// @route GET /api/categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async cat => {
        const count = await Product.countDocuments({ category: cat._id, isActive: true });
        return {
          ...cat.toObject(),
          itemCount: count
        };
      })
    );

    res.status(200).json({
      success: true,
      categories: categoriesWithCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc Admin: Create category
// @route POST /api/categories
exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, message: 'Category created', category });
  } catch (err) {
    next(err);
  }
};

// @desc Admin: Update category
// @route PUT /api/categories/:id
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, message: 'Category updated', category });
  } catch (err) {
    next(err);
  }
};

// @desc Admin: Delete category
// @route DELETE /api/categories/:id
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};
