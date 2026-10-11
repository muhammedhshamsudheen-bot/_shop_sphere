const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { connectDB, disconnectDB } = require('../config/database');

const seedInitialData = async () => {
  console.log('[Seed] Clearing existing store records...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    Review.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({})
  ]);

  console.log('[Seed] Seeding Users...');
  const admin = await User.create({
    name: 'Admin Supervisor',
    email: 'admin@shopcart.com',
    password: 'Admin@12345',
    phone: '+91 9876543210',
    role: 'admin',
    addresses: [
      {
        fullName: 'ShopSphere Headquarters',
        phone: '+91 9876543210',
        street: '42 MG Road, Cyber Tech Park',
        apartment: 'Suite 401',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
        isDefault: true
      }
    ]
  });

  const customer = await User.create({
    name: 'Muhammed Shamsu',
    email: 'customer@shopcart.com',
    password: 'Customer@12345',
    phone: '+91 9846012345',
    role: 'customer',
    addresses: [
      {
        fullName: 'Muhammed Shamsu',
        phone: '+91 9846012345',
        street: '15 Crescent Marine Drive',
        apartment: 'Flat 5B, Silver Heights',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682011',
        country: 'India',
        isDefault: true
      },
      {
        fullName: 'Muhammed Shamsu (Work)',
        phone: '+91 9846012345',
        street: 'Infopark Phase 2, Smart City',
        apartment: 'Tower B, 3rd Floor',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682042',
        country: 'India',
        isDefault: false
      }
    ]
  });

  console.log('[Seed] Seeding Categories...');
  const categoriesData = [
    {
      name: 'Electronics',
      slug: 'electronics',
      icon: 'fa-laptop',
      description: 'Cutting-edge gadgets, smartphones, laptops, audio and wearables',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&q=80'
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      icon: 'fa-shirt',
      description: 'Trending runway fashion, everyday denim, shirts and ethnic wear',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80'
    },
    {
      name: 'Footwear',
      slug: 'footwear',
      icon: 'fa-shoe-prints',
      description: 'Performance running sneakers, formal dress shoes, and casual trainers',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-and-kitchen',
      icon: 'fa-couch',
      description: 'Modern cookware, smart home appliances, air purifiers and decor',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80'
    },
    {
      name: 'Beauty',
      slug: 'beauty',
      icon: 'fa-spa',
      description: 'Dermatologist skincare, serums, personal grooming, and luxury wellness',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80'
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      icon: 'fa-glasses',
      description: 'Premium timepieces, polarized eyewear, leather luggage, and bags',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
    }
  ];

  const categories = await Category.insertMany(categoriesData);
  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c; });

  console.log('[Seed] Seeding Products (36 flagship Amazon & Flipkart bestsellers)...');
  const productsData = [
    // -------------------------------------------------------------------------
    // 1. ELECTRONICS & COMPUTING (Amazon & Flipkart Best Sellers)
    // -------------------------------------------------------------------------
    {
      title: 'Apple iPhone 15 Pro Max (256 GB) - Natural Titanium',
      description: 'Forged in titanium and featuring the groundbreaking A17 Pro chip, a customizable Action button, and the most powerful iPhone camera system ever with 5x optical zoom.',
      category: catMap['electronics']._id,
      categoryName: 'Electronics',
      brand: 'Apple',
      images: [
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80'
      ],
      originalPrice: 159900,
      sellingPrice: 148900,
      taxRate: 18,
      stockQuantity: 15,
      averageRating: 4.9,
      numReviews: 88,
      isFeatured: true,
      isTrending: true,
      isBestSeller: true,
      availableColors: ['Natural Titanium', 'Blue Titanium', 'Black Titanium', 'White Titanium'],
      availableSizes: ['256 GB', '512 GB', '1 TB'],
      specifications: {
        'Processor': 'A17 Pro Chip (6-core GPU)',
        'Display': '6.7-inch Super Retina XDR OLED ProMotion 120Hz',
        'Camera': '48MP Main + 12MP Ultra Wide + 12MP 5x Telephoto',
        'Battery': 'Up to 29 hours video playback'
      }
    },
    {
      title: 'Samsung Galaxy S24 Ultra 5G AI Smartphone (Titanium Gray)',
      description: 'Galaxy AI is here. Circle to Search, Live Translate, and Note Assist. Powered by Snapdragon 8 Gen 3 for Galaxy, 200MP camera with Quad Tele System and embedded S Pen.',
      category: catMap['electronics']._id,
      categoryName: 'Electronics',
      brand: 'Samsung',
      images: [
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80'
      ],
      originalPrice: 134999,
      sellingPrice: 129999,
      taxRate: 18,
      stockQuantity: 12,
      averageRating: 4.8,
      numReviews: 74,
      isFeatured: true,
      isTrending: true,
      availableColors: ['Titanium Gray', 'Titanium Black', 'Titanium Violet'],
      availableSizes: ['12GB RAM / 256GB', '12GB RAM / 512GB'],
      specifications: {
        'Display': '6.8-inch Dynamic AMOLED 2X QHD+ (2600 nits)',
        'Processor': 'Snapdragon 8 Gen 3 for Galaxy',
        'Battery': '5000 mAh with 45W Fast Charging',
        'Stylus': 'Embedded Bluetooth S Pen'
      }
    },
    {
      title: 'Apple MacBook Air 13-inch M3 Chip (Liquid Retina, 16GB Unified RAM)',
      description: 'Lean. Mean. M3 machine. Incredibly thin and fast MacBook Air breezes through work and play. Up to 18 hours of battery life with support for up to two external displays.',
      category: catMap['electronics']._id,
      categoryName: 'Electronics',
      brand: 'Apple',
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80'
      ],
      originalPrice: 114900,
      sellingPrice: 104900,
      taxRate: 18,
      stockQuantity: 10,
      averageRating: 4.9,
      numReviews: 52,
      isFeatured: true,
      isBestSeller: true,
      availableColors: ['Midnight', 'Starlight', 'Space Gray', 'Silver'],
      availableSizes: ['16GB RAM / 256GB SSD', '16GB RAM / 512GB SSD'],
      specifications: {
        'Chip': 'Apple M3 (8-core CPU, 10-core GPU)',
        'Memory': '16GB Unified Memory',
        'Display': '13.6-inch Liquid Retina Display with True Tone',
        'Weight': '1.24 kg'
      }
    },
    {
      title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
      description: 'Industry-leading noise cancellation with two processors and 8 microphones. Up to 30-hour battery life with quick charging. Ultra-comfortable lightweight design.',
      category: catMap['electronics']._id,
      categoryName: 'Electronics',
      brand: 'Sony',
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80'
      ],
      originalPrice: 29990,
      sellingPrice: 24990,
      taxRate: 18,
      stockQuantity: 24,
      averageRating: 4.8,
      numReviews: 48,
      isFeatured: true,
      isTrending: true,
      isBestSeller: true,
      availableColors: ['Silver Platinum', 'Midnight Black'],
      availableSizes: ['Over-Ear'],
      specifications: {
        'Battery Life': '30 Hours',
        'Noise Cancellation': 'Dual Processor Active ANC',
        'Connectivity': 'Bluetooth 5.2, 3.5mm Aux',
        'Weight': '250 grams'
      }
    },
    {
      title: 'Apple AirPods Pro (2nd Generation) with MagSafe Case (USB-C)',
      description: 'Up to 2x more Active Noise Cancellation, Adaptive Audio, Transparency mode, Personalized Spatial Audio with dynamic head tracking, and precision finding case.',
      category: catMap['electronics']._id,
      categoryName: 'Electronics',
      brand: 'Apple',
      images: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80',
        'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80'
      ],
      originalPrice: 24900,
      sellingPrice: 21900,
      taxRate: 18,
      stockQuantity: 30,
      averageRating: 4.8,
      numReviews: 65,
      isFeatured: true,
      isTrending: true,
      availableColors: ['Glossy White'],
      specifications: {
        'Chip': 'Apple H2 Headphone Chip',
        'Case Charging': 'USB-C, MagSafe, Apple Watch Charger',
        'Battery': 'Up to 6 hours listening time (30 hours with case)'
      }
    },
    {
      title: 'Marshall Stanmore III Wireless Bluetooth Home Speaker',
      description: 'Legendary room-filling sound with a re-engineered wider stereo soundstage. Iconic brass Marshall script and tactile vintage control knobs with Bluetooth 5.2.',
      category: catMap['electronics']._id,
      categoryName: 'Electronics',
      brand: 'Marshall',
      images: [
        'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80'
      ],
      originalPrice: 34999,
      sellingPrice: 31999,
      taxRate: 18,
      stockQuantity: 8,
      averageRating: 4.7,
      numReviews: 29,
      isNewArrival: true,
      availableColors: ['Vintage Black', 'Cream White', 'Brown'],
      specifications: {
        'Amplifiers': 'One 50 Watt Class D (Woofer), Two 15 Watt (Tweeters)',
        'Frequency Range': '45–20,000 Hz',
        'Inputs': 'Bluetooth 5.2, 3.5 mm Aux, RCA'
      }
    },

    // -------------------------------------------------------------------------
    // 2. FASHION & RUNWAY APPAREL
    // -------------------------------------------------------------------------
    {
      title: 'Levi\'s Men\'s 511 Slim Fit Stretch Denim Jeans',
      description: 'A modern slim with room to move. Added stretch for all-day comfort. Woven with authentic Levi\'s copper rivets and iconic red tab signature styling.',
      category: catMap['fashion']._id,
      categoryName: 'Fashion',
      brand: 'Levi\'s',
      images: [
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80',
        'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&q=80'
      ],
      originalPrice: 3999,
      sellingPrice: 2799,
      taxRate: 12,
      stockQuantity: 35,
      averageRating: 4.6,
      numReviews: 42,
      isFeatured: true,
      isBestSeller: true,
      availableColors: ['Dark Stonewash', 'Clean Rinse Black', 'Light Fade Indigo'],
      availableSizes: ['30', '32', '34', '36'],
      specifications: {
        'Material': '99% Cotton, 1% Elastane',
        'Fit': 'Slim from hip to ankle',
        'Closure': 'Zip fly with shank button'
      }
    },
    {
      title: 'Zara Tailored Textured Double-Breasted Blazer',
      description: 'Sophisticated structured tailoring crafted from premium twill fabric. Peaked lapels, double-breasted button fastening, and flap hip pockets for formal and evening wear.',
      category: catMap['fashion']._id,
      categoryName: 'Fashion',
      brand: 'Zara',
      images: [
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80'
      ],
      originalPrice: 8990,
      sellingPrice: 6990,
      taxRate: 12,
      stockQuantity: 18,
      averageRating: 4.7,
      numReviews: 31,
      isTrending: true,
      availableColors: ['Navy Blue', 'Classic Camel', 'Charcoal Grey'],
      availableSizes: ['S', 'M', 'L', 'XL']
    },
    {
      title: 'Ray-Ban Classic Polarized Wayfarer Sunglasses',
      description: 'The most recognizable style in the history of sunglasses. Iconic square frame with high-grade green G-15 polarized crystal lenses offering 100% UV protection.',
      category: catMap['fashion']._id,
      categoryName: 'Fashion',
      brand: 'Ray-Ban',
      images: [
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80',
        'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&q=80'
      ],
      originalPrice: 10590,
      sellingPrice: 8590,
      taxRate: 18,
      stockQuantity: 22,
      averageRating: 4.9,
      numReviews: 67,
      isFeatured: true,
      isBestSeller: true,
      availableColors: ['Glossy Black / G-15 Lens', 'Tortoise Shell / Brown Lens'],
      availableSizes: ['Standard 50mm', 'Large 54mm'],
      specifications: {
        'Frame Material': 'Hypoallergenic Acetate',
        'Lenses': 'Polarized Crystal Glass UV400'
      }
    },
    {
      title: 'Fabindia Handloom Pure Cotton Kurta with Mandarin Collar',
      description: 'Handwoven traditional cotton kurta dyed with vegetable colors. Straight cut with side slits, mother-of-pearl buttons, and full sleeves for festive and daily comfort.',
      category: catMap['fashion']._id,
      categoryName: 'Fashion',
      brand: 'Fabindia',
      images: [
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80'
      ],
      originalPrice: 2799,
      sellingPrice: 1999,
      taxRate: 12,
      stockQuantity: 28,
      averageRating: 4.5,
      numReviews: 24,
      availableColors: ['Mustard Yellow', 'Forest Green', 'Off White'],
      availableSizes: ['M', 'L', 'XL', 'XXL']
    },
    {
      title: 'Premium 100% Organic Linen Button-Down Shirt',
      description: 'Tailored regular-fit breathable linen shirt ideal for tropical and summer climates. Pre-washed for a soft touch with durable mother-of-pearl buttons.',
      category: catMap['fashion']._id,
      categoryName: 'Fashion',
      brand: 'LinenCraft',
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80'
      ],
      originalPrice: 3499,
      sellingPrice: 2299,
      taxRate: 12,
      stockQuantity: 25,
      averageRating: 4.5,
      numReviews: 16,
      isFeatured: true,
      availableColors: ['Sage Green', 'Pure White', 'Navy Blue'],
      availableSizes: ['S', 'M', 'L', 'XL']
    },
    {
      title: 'Vintage Washed Heavyweight Denim Trucker Jacket',
      description: 'Iconic outerwear staple crafted from 13.5oz rigid denim with antique brass buttons, flap chest pockets, and side welt pockets.',
      category: catMap['fashion']._id,
      categoryName: 'Fashion',
      brand: 'DenimWorks',
      images: [
        'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80'
      ],
      originalPrice: 5999,
      sellingPrice: 3999,
      taxRate: 12,
      stockQuantity: 14,
      averageRating: 4.7,
      numReviews: 22,
      isNewArrival: true,
      availableColors: ['Washed Indigo', 'Vintage Black'],
      availableSizes: ['M', 'L', 'XL']
    },

    // -------------------------------------------------------------------------
    // 3. FOOTWEAR & SNEAKERS (Top Flipkart & Amazon Shoes)
    // -------------------------------------------------------------------------
    {
      title: 'Adidas Ultraboost Light Performance Running Shoes',
      description: 'Experience epic energy return with the lightest Boost ever made. Continental Better Rubber outsole provides superior grip on wet and dry surfaces.',
      category: catMap['footwear']._id,
      categoryName: 'Footwear',
      brand: 'Adidas',
      images: [
        'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&q=80'
      ],
      originalPrice: 18999,
      sellingPrice: 14999,
      taxRate: 18,
      stockQuantity: 20,
      averageRating: 4.9,
      numReviews: 54,
      isFeatured: true,
      isBestSeller: true,
      availableColors: ['Core Black / Solar Red', 'Cloud White', 'Lucid Blue'],
      availableSizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
      specifications: {
        'Cushioning': 'Light BOOST foam (30% lighter)',
        'Upper': 'Adidas PRIMEKNIT+ textile',
        'Drop': '10 mm'
      }
    },
    {
      title: 'Nike Air Zoom Pegasus 40 Road Running Shoes',
      description: 'A springy ride for every run. Engineered mesh upper enhances breathability, while Nike React foam with dual Zoom Air units propels every stride.',
      category: catMap['footwear']._id,
      categoryName: 'Footwear',
      brand: 'Nike',
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80'
      ],
      originalPrice: 11895,
      sellingPrice: 8995,
      taxRate: 18,
      stockQuantity: 26,
      averageRating: 4.8,
      numReviews: 45,
      isFeatured: true,
      isTrending: true,
      availableColors: ['University Red', 'Triple Black', 'White / Royal'],
      availableSizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10']
    },
    {
      title: 'Puma RS-X Reinvent Chunky Retro Sneakers',
      description: 'Bold extreme silhouette inspired by 80s running heritage. Running System cushioning technology, breathable mesh upper with suede and synthetic leather overlays.',
      category: catMap['footwear']._id,
      categoryName: 'Footwear',
      brand: 'Puma',
      images: [
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80'
      ],
      originalPrice: 7999,
      sellingPrice: 5499,
      taxRate: 18,
      stockQuantity: 18,
      averageRating: 4.6,
      numReviews: 28,
      isTrending: true,
      availableColors: ['White / Rose Quartz', 'Triple Black'],
      availableSizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9']
    },
    {
      title: 'Converse Chuck 70 Vintage High Top Canvas Sneakers',
      description: 'The Chuck 70 celebrates the original 1970s design with premium 12oz canvas, higher rubber foxing, winged tongue stitching, and vintage license plate branding.',
      category: catMap['footwear']._id,
      categoryName: 'Footwear',
      brand: 'Converse',
      images: [
        'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&q=80'
      ],
      originalPrice: 6999,
      sellingPrice: 5999,
      taxRate: 18,
      stockQuantity: 30,
      averageRating: 4.8,
      numReviews: 38,
      isBestSeller: true,
      availableColors: ['Black / Egret', 'Parchment White'],
      availableSizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10']
    },
    {
      title: 'Handcrafted Full-Grain Leather Chelsea Boots',
      description: 'Timeless silhouette crafted from Spanish full-grain calfskin leather, Goodyear welted construction, and durable Dainite studded rubber soles.',
      category: catMap['footwear']._id,
      categoryName: 'Footwear',
      brand: 'Heritage Boot Co',
      images: [
        'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&q=80'
      ],
      originalPrice: 14999,
      sellingPrice: 10499,
      taxRate: 18,
      stockQuantity: 8,
      averageRating: 4.9,
      numReviews: 18,
      availableColors: ['Cognac Tan', 'Deep Espresso'],
      availableSizes: ['UK 8', 'UK 9', 'UK 10']
    },
    {
      title: 'Canvas Slip-On Minimalist Skate Sneakers',
      description: 'Vulcanized rubber sole, cushioned OrthoLite insole, and double-stitched heavy canvas upper for skate durability and everyday comfort.',
      category: catMap['footwear']._id,
      categoryName: 'Footwear',
      brand: 'Veloce',
      images: [
        'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80'
      ],
      originalPrice: 3499,
      sellingPrice: 1999,
      taxRate: 12,
      stockQuantity: 35,
      averageRating: 4.3,
      numReviews: 12,
      availableColors: ['Off-White', 'Black Gum'],
      availableSizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10']
    },

    // -------------------------------------------------------------------------
    // 4. HOME & KITCHEN APPLIANCES (Amazon & Flipkart Best Sellers)
    // -------------------------------------------------------------------------
    {
      title: 'Wonderchef Granite 5-Piece Non-Stick Induction Cookware Set with Glass Lids',
      description: 'Healthy non-stick coating with virgin grade aluminum core that ensures 9x faster heat conduction. PFOA-free, heavy metal-free, induction and gas stove compatible.',
      category: catMap['home-and-kitchen']._id,
      categoryName: 'Home & Kitchen',
      brand: 'Wonderchef',
      images: [
        'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&q=80',
        'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&q=80'
      ],
      originalPrice: 6499,
      sellingPrice: 3999,
      taxRate: 12,
      stockQuantity: 25,
      averageRating: 4.7,
      numReviews: 53,
      isFeatured: true,
      isBestSeller: true,
      availableColors: ['Granite Grey', 'Royal Purple'],
      specifications: {
        'Includes': '24cm Frying Pan, 24cm Kadhai with Lid, 24cm Dosa Tawa, Spatula',
        'Coating': 'Multi-layer 5-Coat Non-stick',
        'Base': 'Gas & Induction Friendly 3.5mm Thick Base',
        'Warranty': '2 Years Manufacturer Warranty'
      }
    },
    {
      title: 'Philips Digital Air Fryer XL with Rapid Air Technology (6.2 Liters)',
      description: 'Fry with up to 90% less fat. Rapid Air Technology with unique starfish design swirls hot air to create delicious foods that are crispy on the outside and tender on the inside.',
      category: catMap['home-and-kitchen']._id,
      categoryName: 'Home & Kitchen',
      brand: 'Philips',
      images: [
        'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800&q=80'
      ],
      originalPrice: 14995,
      sellingPrice: 9999,
      taxRate: 18,
      stockQuantity: 16,
      averageRating: 4.8,
      numReviews: 64,
      isFeatured: true,
      isTrending: true,
      availableColors: ['Piano Black / Silver Accent'],
      specifications: {
        'Capacity': '6.2 Liters (1.2 kg Fries)',
        'Power': '2000 Watts',
        'Presets': '7 Touchscreen Preset Cooking Programs'
      }
    },
    {
      title: 'Dyson V12 Detect Slim Total Clean Cordless Vacuum Cleaner',
      description: 'Dyson\'s most powerful, compact cordless vacuum with laser illumination revealing microscopic dust. Piezo sensor continuously sizes and counts dust particles.',
      category: catMap['home-and-kitchen']._id,
      categoryName: 'Home & Kitchen',
      brand: 'Dyson',
      images: [
        'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80'
      ],
      originalPrice: 59900,
      sellingPrice: 52900,
      taxRate: 18,
      stockQuantity: 7,
      averageRating: 4.9,
      numReviews: 33,
      isFeatured: true,
      availableColors: ['Prussian Blue / Copper', 'Yellow / Iron'],
      specifications: {
        'Suction Power': '150 Air Watts',
        'Run Time': 'Up to 60 Minutes Fade-Free Suction',
        'Weight': '2.2 kg Lightweight Design'
      }
    },
    {
      title: 'Prestige Deluxe Alpha Induction Stainless Steel Pressure Cooker 5L',
      description: 'Crafted from high-grade 304 austenitic stainless steel with unique Alpha base for even heat distribution. Pressure indicator and controlled gasket release system.',
      category: catMap['home-and-kitchen']._id,
      categoryName: 'Home & Kitchen',
      brand: 'Prestige',
      images: [
        'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=800&q=80'
      ],
      originalPrice: 3850,
      sellingPrice: 2850,
      taxRate: 12,
      stockQuantity: 40,
      averageRating: 4.6,
      numReviews: 78,
      isBestSeller: true,
      specifications: {
        'Capacity': '5 Liters',
        'Material': 'AISI 304 Stainless Steel',
        'Base': 'Heavy Alpha Induction Base'
      }
    },
    {
      title: 'De\'Longhi Dedica Deluxe Manual Espresso Machine',
      description: '15-bar professional pressure pump, premium stainless steel casing, and adjustable manual frother for creamy cappuccinos and authentic Italian espressos.',
      category: catMap['home-and-kitchen']._id,
      categoryName: 'Home & Kitchen',
      brand: 'De\'Longhi',
      images: [
        'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&q=80',
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
      ],
      originalPrice: 24999,
      sellingPrice: 19499,
      taxRate: 18,
      stockQuantity: 10,
      averageRating: 4.7,
      numReviews: 31,
      availableColors: ['Brushed Metal', 'Matte Black']
    },
    {
      title: 'Smart True HEPA Air Purifier with Real-Time AQI Sensor',
      description: '3-stage filtration capturing 99.97% of airborne particles as small as 0.3 microns. Real-time air quality index light and whisper-quiet sleep mode.',
      category: catMap['home-and-kitchen']._id,
      categoryName: 'Home & Kitchen',
      brand: 'AeroClean',
      images: [
        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80'
      ],
      originalPrice: 14999,
      sellingPrice: 10999,
      taxRate: 18,
      stockQuantity: 9,
      averageRating: 4.6,
      numReviews: 17
    },

    // -------------------------------------------------------------------------
    // 5. BEAUTY, WELLNESS & GROOMING (Amazon & Flipkart Best Sellers)
    // -------------------------------------------------------------------------
    {
      title: 'Minimalist 10% Niacinamide + Zinc Daily Blemish Face Serum (30ml)',
      description: 'Clinically proven formula with pure Vitamin B3 and Matmarine to reduce blemishes, control excess sebum, and improve skin texture without causing redness.',
      category: catMap['beauty']._id,
      categoryName: 'Beauty',
      brand: 'Minimalist',
      images: [
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80'
      ],
      originalPrice: 699,
      sellingPrice: 599,
      taxRate: 18,
      stockQuantity: 75,
      averageRating: 4.8,
      numReviews: 112,
      isFeatured: true,
      isBestSeller: true,
      specifications: {
        'Volume': '30 ml',
        'Key Actives': '10% Niacinamide, 1% Zinc PCA, Aloe Leaf Juice',
        'Skin Type': 'Acne-prone, Oily, Combination'
      }
    },
    {
      title: 'Philips Series 7000 14-in-1 All-in-One Trimmer & Grooming Kit',
      description: 'DualCut self-sharpening stainless steel blades with steel precision trimmer, nose/ear trimmer, body groomer, and 8 impact-resistant guards. 100% waterproof.',
      category: catMap['beauty']._id,
      categoryName: 'Beauty',
      brand: 'Philips',
      images: [
        'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800&q=80'
      ],
      originalPrice: 4995,
      sellingPrice: 3495,
      taxRate: 18,
      stockQuantity: 32,
      averageRating: 4.7,
      numReviews: 58,
      isFeatured: true,
      isTrending: true,
      specifications: {
        'Battery': 'Lithium-ion with 120 Mins Runtime (1-hr Quick Charge)',
        'Tools': '14 Grooming Attachments (Beard, Hair, Body, Nose)'
      }
    },
    {
      title: 'Dyson Airwrap Multi-Styler Complete Long (Nickel/Copper)',
      description: 'Curl, wave, smooth, and dry with no extreme heat. Utilizes the Coanda aerodynamic effect powered by Dyson digital motor V9 for salon-worthy styles.',
      category: catMap['beauty']._id,
      categoryName: 'Beauty',
      brand: 'Dyson',
      images: [
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80'
      ],
      originalPrice: 49900,
      sellingPrice: 45900,
      taxRate: 18,
      stockQuantity: 11,
      averageRating: 4.9,
      numReviews: 43,
      isFeatured: true,
      specifications: {
        'Technology': 'Coanda Airflow Styling (Under 150°C Intelligent Heat Control)',
        'Attachments': '6 Barrels & Brushes + Filter Cleaning Brush + Storage Case'
      }
    },
    {
      title: 'Forest Essentials Soundarya Radiance Cream with 24K Gold & SPF 25',
      description: 'Pure Ayurvedic elixir enriched with 24 Karat Gold Bhasma and SPF 25. Deeply moisturizes, enhances collagen production, and restores timeless youthful luminosity.',
      category: catMap['beauty']._id,
      categoryName: 'Beauty',
      brand: 'Forest Essentials',
      images: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80'
      ],
      originalPrice: 7500,
      sellingPrice: 6800,
      taxRate: 18,
      stockQuantity: 18,
      averageRating: 4.8,
      numReviews: 36,
      isTrending: true,
      specifications: {
        'Volume': '50 grams',
        'Key Ingredients': '24K Gold Bhasma, Saffron, Ashwagandha, Pure Cold-Pressed Oils'
      }
    },
    {
      title: 'Advanced 20% Vitamin C + Ferulic Acid Glow Serum (30ml)',
      description: 'Potent antioxidant brightening formula targets dark spots, hyperpigmentation, and promotes collagen synthesis for a luminous radiant complexion.',
      category: catMap['beauty']._id,
      categoryName: 'Beauty',
      brand: 'DermaPure',
      images: [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80'
      ],
      originalPrice: 1899,
      sellingPrice: 1299,
      taxRate: 18,
      stockQuantity: 50,
      averageRating: 4.8,
      numReviews: 62
    },
    {
      title: 'Botanical Gentle Hydrating Foaming Cleanser (150ml)',
      description: 'Sulfate-free pH balanced face wash enriched with chamomile, green tea extract, and ceramides to remove impurities without stripping moisture.',
      category: catMap['beauty']._id,
      categoryName: 'Beauty',
      brand: 'DermaPure',
      images: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80'
      ],
      originalPrice: 999,
      sellingPrice: 699,
      taxRate: 18,
      stockQuantity: 60,
      averageRating: 4.6,
      numReviews: 28
    },

    // -------------------------------------------------------------------------
    // 6. ACCESSORIES, TRAVEL & BAGS (Amazon & Flipkart Best Sellers)
    // -------------------------------------------------------------------------
    {
      title: 'American Tourister Curio Hardside 75cm Large Checked Suitcase',
      description: 'Inspired by retro vinyl records. Made from durable polypropylene with scratch-resistant grooved shell, TSA 3-dial combination lock, and 360° smooth dual spinner wheels.',
      category: catMap['accessories']._id,
      categoryName: 'Accessories',
      brand: 'American Tourister',
      images: [
        'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&q=80'
      ],
      originalPrice: 11500,
      sellingPrice: 7499,
      taxRate: 18,
      stockQuantity: 15,
      averageRating: 4.8,
      numReviews: 55,
      isFeatured: true,
      isBestSeller: true,
      availableColors: ['Midnight Blue', 'Matte Black', 'Sunset Orange'],
      specifications: {
        'Capacity': '125 Liters (Expandable)',
        'Material': '100% Polypropylene',
        'Lock': 'Recessed TSA Flush Lock',
        'Warranty': '3 Years Global Warranty'
      }
    },
    {
      title: 'Fossil Grant Chronograph Dark Brown Leather Watch',
      description: 'Vintage-inspired Roman numerals and classic three-hand chronograph stopwatch movement. Premium dark brown genuine leather strap with stainless steel casing.',
      category: catMap['accessories']._id,
      categoryName: 'Accessories',
      brand: 'Fossil',
      images: [
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80'
      ],
      originalPrice: 14995,
      sellingPrice: 11995,
      taxRate: 18,
      stockQuantity: 14,
      averageRating: 4.7,
      numReviews: 46,
      isFeatured: true,
      availableColors: ['Dark Brown / Blue Dial', 'Black / Rose Gold'],
      specifications: {
        'Case Size': '44 mm Stainless Steel',
        'Water Resistance': '5 ATM / 50 meters',
        'Strap Width': '22 mm Interchangeable'
      }
    },
    {
      title: 'Tommy Hilfiger Commuter Water-Resistant Laptop Backpack 28L',
      description: 'Dedicated padded compartment for up to 15.6-inch laptops. Ergonomic breathable air-mesh back panel, anti-theft hidden pocket, and water-repellent ballistic polyester.',
      category: catMap['accessories']._id,
      categoryName: 'Accessories',
      brand: 'Tommy Hilfiger',
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'
      ],
      originalPrice: 5999,
      sellingPrice: 3299,
      taxRate: 18,
      stockQuantity: 28,
      averageRating: 4.6,
      numReviews: 39,
      isTrending: true,
      availableColors: ['Signature Navy', 'Stealth Charcoal'],
      specifications: {
        'Capacity': '28 Liters',
        'Laptop Sleeve': 'Up to 15.6 inch padded compartment',
        'Material': 'Durable Ballistic Poly with Water-Resistant Coating'
      }
    },
    {
      title: 'Minimalist Slim RFID-Blocking Leather Bifold Wallet',
      description: 'Crafted from top-grain pull-up cowhide leather with precision nylon stitching. Holds up to 10 cards and currency notes with built-in RFID shielding.',
      category: catMap['accessories']._id,
      categoryName: 'Accessories',
      brand: 'Sartorial',
      images: [
        'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80'
      ],
      originalPrice: 2499,
      sellingPrice: 1499,
      taxRate: 18,
      stockQuantity: 45,
      averageRating: 4.7,
      numReviews: 33,
      isBestSeller: true,
      availableColors: ['Vintage Tan', 'Matte Charcoal']
    },
    {
      title: 'Seiko 5 Sports Automatic Stainless Steel Watch',
      description: 'Japanese Calibre 4R36 automatic movement with 41-hour power reserve. Hardlex crystal, unidirectional rotating bezel, and 100m water resistance.',
      category: catMap['accessories']._id,
      categoryName: 'Accessories',
      brand: 'Seiko',
      images: [
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80'
      ],
      originalPrice: 26000,
      sellingPrice: 21500,
      taxRate: 18,
      stockQuantity: 7,
      averageRating: 4.9,
      numReviews: 40
    },
    {
      title: 'Polarized Aviator Sunglasses with UV400 Protection',
      description: 'Ultra-lightweight titanium alloy frame with scratch-resistant polarized lenses that eliminate glare and block 100% of harmful UVA/UVB rays.',
      category: catMap['accessories']._id,
      categoryName: 'Accessories',
      brand: 'SunOptics',
      images: [
        'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80'
      ],
      originalPrice: 3999,
      sellingPrice: 2499,
      taxRate: 18,
      stockQuantity: 28,
      averageRating: 4.5,
      numReviews: 21
    }
  ];

  const products = await Product.insertMany(productsData);

  console.log('[Seed] Seeding Coupons...');
  const couponsData = [
    {
      code: 'WELCOME10',
      description: '10% discount on orders above ₹500 (Max ₹500)',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 500,
      maxDiscount: 500,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2030-12-31'),
      usageLimit: 5000,
      perUserLimit: 2,
      isActive: true
    },
    {
      code: 'SAVE200',
      description: 'Flat ₹200 off on minimum purchase of ₹1,500',
      discountType: 'fixed',
      discountValue: 200,
      minOrderValue: 1500,
      maxDiscount: 200,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2030-12-31'),
      usageLimit: 1000,
      perUserLimit: 5,
      isActive: true
    },
    {
      code: 'FREESHIP',
      description: 'Free shipping on any order regardless of amount',
      discountType: 'shipping',
      discountValue: 0,
      minOrderValue: 0,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2030-12-31'),
      usageLimit: 2000,
      perUserLimit: 10,
      isActive: true
    },
    {
      code: 'FESTIVE25',
      description: '25% mega festive discount on orders above ₹2,000 (Max ₹1,000)',
      discountType: 'percentage',
      discountValue: 25,
      minOrderValue: 2000,
      maxDiscount: 1000,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2030-12-31'),
      usageLimit: 500,
      perUserLimit: 1,
      isActive: true
    }
  ];

  await Coupon.insertMany(couponsData);

  console.log('[Seed] Seeding Sample Reviews...');
  const sampleReviews = [
    {
      user: customer._id,
      product: products[0]._id, // iPhone 15 Pro Max
      rating: 5,
      title: 'Unbelievable performance and battery life',
      comment: 'Titanium chassis makes it super lightweight compared to the 14 Pro Max. 5x zoom telephoto lens takes DSLR-grade portraits! Fast delivery from ShopSphere.',
      isVerifiedPurchase: true
    },
    {
      user: customer._id,
      product: products[3]._id, // Sony Headphones
      rating: 5,
      title: 'Best Noise Cancelling Headphones on the market',
      comment: 'Audio fidelity is astonishing. The active noise cancellation completely cuts out office chatter and flight hum. Incredibly light and comfortable for long sessions!',
      isVerifiedPurchase: true
    },
    {
      user: customer._id,
      product: products[18]._id, // Wonderchef Cookware
      rating: 5,
      title: 'Best non-stick cookware set in this price segment',
      comment: 'The granite coating is truly non-stick with zero oil requirement. Induction friendly and washes clean in seconds with a soft sponge. 10/10 recommend!',
      isVerifiedPurchase: true
    }
  ];

  await Review.insertMany(sampleReviews);

  console.log('[Seed] Seeding Sample Order for Customer...');
  const sampleOrder = await Order.create({
    orderNumber: 'ORD-20261011-8924',
    user: customer._id,
    items: [
      {
        product: products[0]._id,
        title: products[0].title,
        image: products[0].images[0],
        originalPrice: products[0].originalPrice,
        sellingPrice: products[0].sellingPrice,
        quantity: 1,
        taxRate: 18,
        taxAmount: 22713.56,
        subtotal: 148900,
        color: 'Natural Titanium'
      },
      {
        product: products[18]._id, // Wonderchef Cookware Set
        title: products[18].title,
        image: products[18].images[0],
        originalPrice: products[18].originalPrice,
        sellingPrice: products[18].sellingPrice,
        quantity: 1,
        taxRate: 12,
        taxAmount: 428.46,
        subtotal: 3999,
        color: 'Granite Grey'
      }
    ],
    shippingAddress: customer.addresses[0],
    deliveryMethod: 'express',
    originalSubtotal: 166399,
    sellingSubtotal: 152899,
    productDiscountTotal: 13500,
    couponCode: 'WELCOME10',
    couponDiscountTotal: 500,
    taxableAmount: 129406.98,
    taxAmount: 23142.02,
    shippingFee: 150,
    totalAmount: 152549,
    paymentStatus: 'paid',
    paymentMethod: 'UPI / NetBanking (Razorpay)',
    razorpayOrderId: 'order_seed_demo_7812',
    razorpayPaymentId: 'pay_seed_demo_9921',
    razorpaySignature: 'sim_sig_verified_seed',
    orderStatus: 'Shipped',
    timeline: [
      {
        status: 'Confirmed',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        note: 'Payment verified via Razorpay UPI. Order confirmed.'
      },
      {
        status: 'Processing',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        note: 'Items picked and quality inspected at fulfillment center.'
      },
      {
        status: 'Shipped',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        note: 'Dispatched via Express Courier. Tracking ID: TRK89241088.'
      }
    ],
    trackingNumber: 'TRK89241088',
    invoiceNumber: 'INV-20261011-8924',
    estimatedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
  });

  await Payment.create({
    order: sampleOrder._id,
    user: customer._id,
    razorpayOrderId: 'order_seed_demo_7812',
    razorpayPaymentId: 'pay_seed_demo_9921',
    razorpaySignature: 'sim_sig_verified_seed',
    amount: 152549,
    currency: 'INR',
    status: 'captured',
    method: 'UPI',
    signatureVerified: true
  });

  console.log('✅ [Seed] Database successfully seeded with 36 Amazon & Flipkart bestsellers!');
};

// Standalone execution if called via `node seed.js`
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedInitialData();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Seed error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedInitialData };
