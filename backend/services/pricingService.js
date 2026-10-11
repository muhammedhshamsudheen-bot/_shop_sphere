/**
 * Pricing & GST Tax Calculation Engine
 * Indian GST E-Commerce Compliance
 */

const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

/**
 * Calculate authoritative prices for cart items
 * @param {Array} items - [{ product: id or ProductDoc, quantity, size, color }]
 * @param {String} couponCode - Optional coupon code
 * @param {String} deliveryMethod - 'standard' or 'express'
 * @param {String} userId - Optional User ID for coupon validation
 */
async function calculateCartTotals(items = [], couponCode = null, deliveryMethod = 'standard', userId = null) {
  if (!items || items.length === 0) {
    return {
      items: [],
      originalSubtotal: 0,
      sellingSubtotal: 0,
      productDiscount: 0,
      couponDiscount: 0,
      couponApplied: null,
      taxableAmount: 0,
      taxBreakdown: {
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        byRate: {}
      },
      shippingFee: 0,
      finalTotal: 0,
      itemCount: 0
    };
  }

  // 1. Fetch live product data from database to prevent client price tampering
  const validatedItems = [];
  let originalSubtotal = 0;
  let sellingSubtotal = 0;
  let totalItemCount = 0;

  for (const item of items) {
    const productId = item.product?._id || item.product;
    const productDoc = await Product.findById(productId);

    if (!productDoc || !productDoc.isActive) {
      continue;
    }

    const qty = Math.max(1, Math.min(item.quantity || 1, productDoc.stockQuantity));
    const origPrice = Number(productDoc.originalPrice || productDoc.sellingPrice);
    const sellPrice = Number(productDoc.sellingPrice);
    const taxRate = Number(productDoc.taxRate || 18);

    const lineOrigTotal = round(origPrice * qty);
    const lineSellTotal = round(sellPrice * qty);

    originalSubtotal += lineOrigTotal;
    sellingSubtotal += lineSellTotal;
    totalItemCount += qty;

    validatedItems.push({
      product: productDoc._id,
      title: productDoc.title,
      image: productDoc.images[0] || '',
      brand: productDoc.brand,
      category: productDoc.category,
      categoryName: productDoc.categoryName,
      originalPrice: origPrice,
      sellingPrice: sellPrice,
      taxRate: taxRate,
      quantity: qty,
      size: item.size || '',
      color: item.color || '',
      lineOriginalSubtotal: lineOrigTotal,
      lineSellingSubtotal: lineSellTotal,
      stockQuantity: productDoc.stockQuantity
    });
  }

  originalSubtotal = round(originalSubtotal);
  sellingSubtotal = round(sellingSubtotal);
  const productDiscount = round(Math.max(0, originalSubtotal - sellingSubtotal));

  // 2. Coupon Validation & Calculation
  let couponDiscount = 0;
  let couponApplied = null;
  let couponError = null;

  if (couponCode && couponCode.trim()) {
    const code = couponCode.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      couponError = 'Invalid or expired coupon code';
    } else {
      const now = new Date();
      if (now < new Date(coupon.validFrom) || now > new Date(coupon.validUntil)) {
        couponError = 'This coupon has expired';
      } else if (coupon.usedCount >= coupon.usageLimit) {
        couponError = 'This coupon has reached its maximum usage limit';
      } else if (sellingSubtotal < coupon.minOrderValue) {
        couponError = `Coupon requires a minimum order value of ₹${coupon.minOrderValue}`;
      } else if (userId && coupon.perUserLimit) {
        const userUsage = coupon.userUsage.find(u => u.userId && u.userId.toString() === userId.toString());
        if (userUsage && userUsage.count >= coupon.perUserLimit) {
          couponError = `You have already used this coupon maximum allowed times (${coupon.perUserLimit})`;
        }
      }

      if (!couponError) {
        if (coupon.discountType === 'percentage') {
          let disc = (sellingSubtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount > 0) {
            disc = Math.min(disc, coupon.maxDiscount);
          }
          couponDiscount = round(disc);
        } else if (coupon.discountType === 'fixed') {
          couponDiscount = round(Math.min(coupon.discountValue, sellingSubtotal));
        } else if (coupon.discountType === 'shipping') {
          // Free shipping coupon
          couponDiscount = 0; // Handled in shipping fee
        }

        couponApplied = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: couponDiscount,
          description: coupon.description
        };
      }
    }
  }

  // 3. Proportional discount allocation for precise per-item GST calculation
  const netDiscountedSubtotal = round(Math.max(0, sellingSubtotal - couponDiscount));
  const discountRatio = sellingSubtotal > 0 ? (netDiscountedSubtotal / sellingSubtotal) : 1;

  let totalTax = 0;
  let taxableAmount = 0;
  const byRate = {};

  validatedItems.forEach(item => {
    // Net price after coupon share
    const discountedLineTotal = round(item.lineSellingSubtotal * discountRatio);
    
    // In retail e-commerce pricing, selling price is typically inclusive of GST.
    // Base taxable amount = InclusivePrice / (1 + Rate / 100)
    // Tax = InclusivePrice - Base taxable amount
    const rate = item.taxRate;
    const baseAmount = round(discountedLineTotal / (1 + rate / 100));
    const lineTax = round(discountedLineTotal - baseAmount);

    item.taxableAmount = baseAmount;
    item.taxAmount = lineTax;

    taxableAmount += baseAmount;
    totalTax += lineTax;

    if (!byRate[rate]) {
      byRate[rate] = { rate, taxableAmount: 0, taxAmount: 0, cgst: 0, sgst: 0 };
    }
    byRate[rate].taxableAmount = round(byRate[rate].taxableAmount + baseAmount);
    byRate[rate].taxAmount = round(byRate[rate].taxAmount + lineTax);
    byRate[rate].cgst = round(byRate[rate].taxAmount / 2);
    byRate[rate].sgst = round(byRate[rate].taxAmount / 2);
  });

  taxableAmount = round(taxableAmount);
  totalTax = round(totalTax);

  // 4. Shipping Calculation
  const freeShippingThreshold = Number(process.env.FREE_SHIPPING_THRESHOLD || 999);
  const standardFee = Number(process.env.STANDARD_SHIPPING_FEE || 70);
  const expressFee = Number(process.env.EXPRESS_SHIPPING_FEE || 150);

  let shippingFee = 0;
  if (couponApplied && couponApplied.discountType === 'shipping') {
    shippingFee = 0;
  } else if (deliveryMethod === 'express') {
    shippingFee = expressFee;
  } else {
    shippingFee = netDiscountedSubtotal >= freeShippingThreshold || netDiscountedSubtotal === 0 ? 0 : standardFee;
  }

  // 5. Final Payable Amount
  // Since selling prices are tax-inclusive in Indian consumer retail:
  // Final total = (sellingSubtotal - couponDiscount) + shippingFee
  // If tax-exclusive pricing was chosen, final total would be taxableAmount + totalTax + shippingFee
  // In both interpretations, the numbers reconcile transparently.
  const finalTotal = round(netDiscountedSubtotal + shippingFee);

  const estDays = deliveryMethod === 'express' ? 2 : 5;
  const estimatedDeliveryDate = new Date(Date.now() + estDays * 24 * 60 * 60 * 1000);
  const standardDeliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const expressDeliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  return {
    items: validatedItems,
    itemCount: totalItemCount,
    originalSubtotal,
    sellingSubtotal,
    productDiscount,
    couponDiscount,
    couponApplied,
    couponError,
    taxableAmount,
    taxBreakdown: {
      cgst: round(totalTax / 2),
      sgst: round(totalTax / 2),
      igst: totalTax,
      totalTax,
      byRate
    },
    shippingFee,
    freeShippingThreshold,
    deliveryMethod,
    estimatedDeliveryDays: estDays,
    estimatedDeliveryDate,
    standardDeliveryDate,
    expressDeliveryDate,
    finalTotal
  };
}

function round(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  calculateCartTotals,
  round
};
