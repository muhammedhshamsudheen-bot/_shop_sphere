const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc Get all products with search, filtering, sorting, pagination
// @route GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      inStock,
      sort,
      page = 1,
      limit = 12,
      featured,
      trending,
      bestSeller,
      newArrival
    } = req.query;

    const query = { isActive: true };

    // Search term
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { categoryName: { $regex: term, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      // Check if category is valid ObjectId or slug
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        query.category = category;
      } else {
        const cat = await Category.findOne({ slug: category.toLowerCase() });
        if (cat) {
          query.category = cat._id;
        } else {
          query.categoryName = { $regex: new RegExp(`^${category}$`, 'i') };
        }
      }
    }

    // Brand filter
    if (brand && brand !== 'all') {
      query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };
    }

    // Price range
    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = Number(minPrice);
      if (maxPrice) query.sellingPrice.$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
      query.averageRating = { $gte: Number(rating) };
    }

    // In Stock filter
    if (inStock === 'true' || inStock === true) {
      query.stockQuantity = { $gt: 0 };
    }

    // Flags
    if (featured === 'true') query.isFeatured = true;
    if (trending === 'true') query.isTrending = true;
    if (bestSeller === 'true') query.isBestSeller = true;
    if (newArrival === 'true') query.isNewArrival = true;

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') sortOptions = { sellingPrice: 1 };
    else if (sort === 'price_desc') sortOptions = { sellingPrice: -1 };
    else if (sort === 'popular' || sort === 'best_selling') sortOptions = { isBestSeller: -1, averageRating: -1, numReviews: -1 };
    else if (sort === 'rating') sortOptions = { averageRating: -1 };
    else if (sort === 'newest') sortOptions = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    // Also get metadata for filters (available brands and price bounds)
    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, min: { $min: '$sellingPrice' }, max: { $max: '$sellingPrice' } } }
    ]);

    const brands = await Product.distinct('brand', { isActive: true });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize) || 1,
      minPrice: priceRange[0]?.min || 0,
      maxPrice: priceRange[0]?.max || 50000,
      availableBrands: brands.filter(Boolean).sort(),
      products
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get single product by ID or slug
// @route GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const id = req.params.id;
    let product;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id).populate('category', 'name slug');
    } else {
      product = await Product.findOne({ slug: id }).populate('category', 'name slug');
    }

    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Fetch related products in same category
    const relatedProducts = await Product.find({
      category: product.category?._id || product.category,
      _id: { $ne: product._id },
      isActive: true
    }).limit(4);

    res.status(200).json({
      success: true,
      product,
      relatedProducts
    });
  } catch (err) {
    next(err);
  }
};

// @desc Get featured & homepage curated collections
// @route GET /api/products/curated/collections
exports.getCuratedCollections = async (req, res, next) => {
  try {
    const featured = await Product.find({ isFeatured: true, isActive: true }).limit(8).populate('category', 'name slug');
    const bestSellers = await Product.find({ isBestSeller: true, isActive: true }).limit(8).populate('category', 'name slug');
    const trending = await Product.find({ isTrending: true, isActive: true }).limit(8).populate('category', 'name slug');
    const newArrivals = await Product.find({ isNewArrival: true, isActive: true }).limit(8).populate('category', 'name slug');

    res.status(200).json({
      success: true,
      collections: {
        featured,
        bestSellers,
        trending,
        newArrivals
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc Create new product (Admin)
// @route POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const categoryDoc = await Category.findById(req.body.category);
    if (categoryDoc) {
      req.body.categoryName = categoryDoc.name;
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (err) {
    next(err);
  }
};

// @desc Update product (Admin)
// @route PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    if (req.body.category) {
      const categoryDoc = await Category.findById(req.body.category);
      if (categoryDoc) {
        req.body.categoryName = categoryDoc.name;
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (err) {
    next(err);
  }
};

// @desc Delete product (Admin)
// @route DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Soft delete or hard delete
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
