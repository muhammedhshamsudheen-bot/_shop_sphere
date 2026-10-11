/**
 * Multi-Step Checkout & Payment Processing
 */

let checkoutState = {
  currentStep: 1,
  deliveryMethod: 'standard',
  selectedAddress: null,
  addresses: [],
  quote: null,
  isProcessing: false
};

async function initCheckout() {
  if (!auth.isLoggedIn()) {
    showToast('Please log in to proceed with checkout', 'info');
    setTimeout(() => { window.location.href = 'login.html?redirect=checkout.html'; }, 600);
    return;
  }

  try {
    // 1. Fetch user profile for saved addresses
    const userRes = await api.get('/auth/me');
    checkoutState.addresses = userRes.user?.addresses || [];
    if (checkoutState.addresses.length > 0) {
      checkoutState.selectedAddress = checkoutState.addresses.find(a => a.isDefault) || checkoutState.addresses[0];
    }

    // 2. Fetch authoritative checkout quote from backend
    await refreshQuote();

    if (!checkoutState.quote || !checkoutState.quote.items || checkoutState.quote.items.length === 0) {
      showToast('Your cart is empty. Redirecting to shop...', 'warning');
      setTimeout(() => { window.location.href = 'shop.html'; }, 1000);
      return;
    }

    renderCheckoutStep(1);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function refreshQuote() {
  const quoteRes = await api.post('/checkout/quote', {
    deliveryMethod: checkoutState.deliveryMethod
  });
  checkoutState.quote = quoteRes.quote;
  renderCheckoutSummary();
}

function setCheckoutStep(stepNumber) {
  checkoutState.currentStep = stepNumber;

  // Update Stepper UI
  document.querySelectorAll('.step-item').forEach((el, idx) => {
    const s = idx + 1;
    el.classList.remove('active', 'completed');
    if (s === stepNumber) {
      el.classList.add('active');
    } else if (s < stepNumber) {
      el.classList.add('completed');
    }
  });

  renderCheckoutStep(stepNumber);
}

function renderCheckoutStep(step) {
  const container = document.getElementById('checkout-step-content');
  if (!container || !checkoutState.quote) return;

  if (step === 1) {
    // Step 1: Cart Review
    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 2rem;">
        <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 1.5rem;">Step 1: Review Cart Items</h3>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
          ${checkoutState.quote.items.map(item => `
            <div style="display: flex; gap: 1rem; align-items: center; border-bottom: 1px solid var(--surface-border); padding-bottom: 1rem;">
              <img src="${item.image}" alt="${item.title}" style="width: 70px; height: 70px; object-fit: cover; border-radius: var(--radius-md);" />
              <div style="flex: 1;">
                <h4 style="font-size: 0.95rem; font-weight: 700;">${item.title}</h4>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Qty: <strong>${item.quantity}</strong> | ${item.size ? 'Size: ' + item.size + ' | ' : ''} GST: ${item.taxRate}%
                </div>
              </div>
              <div style="text-align: right; font-weight: 800; font-size: 1.05rem;">
                ${formatCurrency(item.lineSellingSubtotal)}
              </div>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <a href="cart.html" class="btn btn-secondary btn-sm"><i class="fas fa-edit"></i> Edit Cart</a>
          <button class="btn btn-primary" onclick="setCheckoutStep(2)">
            Continue to Delivery Address <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  } else if (step === 2) {
    // Step 2: Delivery Address
    const addressCards = checkoutState.addresses.map((addr, idx) => {
      const isSelected = checkoutState.selectedAddress?._id === addr._id || (!checkoutState.selectedAddress && idx === 0);
      return `
        <div class="address-select-card ${isSelected ? 'selected' : ''}" onclick="selectAddress('${addr._id}')" style="border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--surface-border)'}; background: ${isSelected ? 'var(--primary-light)' : '#fff'}; border-radius: var(--radius-md); padding: 1.25rem; cursor: pointer; transition: var(--transition-fast);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <strong style="font-size: 1rem; color: var(--text-main);">${addr.fullName}</strong>
            ${addr.isDefault ? '<span class="badge badge-primary">DEFAULT</span>' : ''}
          </div>
          <div style="font-size: 0.875rem; color: #475569; line-height: 1.5;">
            ${addr.street}, ${addr.apartment ? addr.apartment + ', ' : ''}${addr.city}, ${addr.state} - <strong>${addr.postalCode}</strong>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">
            <i class="fas fa-phone-alt" style="font-size: 0.75rem;"></i> ${addr.phone}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.35rem; font-weight: 800;">Step 2: Delivery Address</h3>
          <button class="btn btn-outline-primary btn-sm" onclick="openNewAddressModal()">
            <i class="fas fa-plus"></i> Add New Address
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          ${addressCards || '<p style="color: #64748b;">No saved addresses found. Please add a shipping address.</p>'}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button class="btn btn-secondary" onclick="setCheckoutStep(1)"><i class="fas fa-arrow-left"></i> Back to Review</button>
          <button class="btn btn-primary" onclick="validateAddressAndProceed()" ${!checkoutState.selectedAddress && checkoutState.addresses.length === 0 ? 'disabled' : ''}>
            Continue to Delivery Method <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  } else if (step === 3) {
    // Step 3: Delivery Options
    const standardDateStr = checkoutState.quote?.standardDeliveryDate
      ? formatDeliveryDate(checkoutState.quote.standardDeliveryDate)
      : formatDeliveryDate(getEstimatedDeliveryDate('standard'));
    const expressDateStr = checkoutState.quote?.expressDeliveryDate
      ? formatDeliveryDate(checkoutState.quote.expressDeliveryDate)
      : formatDeliveryDate(getEstimatedDeliveryDate('express'));

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 2rem;">
        <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 1.5rem;">Step 3: Choose Shipping Speed</h3>

        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
          <label style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem; border: 2px solid ${checkoutState.deliveryMethod === 'standard' ? 'var(--primary)' : 'var(--surface-border)'}; background: ${checkoutState.deliveryMethod === 'standard' ? 'var(--primary-light)' : '#fff'}; border-radius: var(--radius-md); cursor: pointer;">
            <input type="radio" name="delivery_method" value="standard" ${checkoutState.deliveryMethod === 'standard' ? 'checked' : ''} onchange="changeDeliveryMethod('standard')" />
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="font-size: 1rem;">Standard Delivery</strong>
                <span class="badge badge-success" style="font-size: 0.72rem;">Economical</span>
              </div>
              <div style="font-size: 0.85rem; color: #047857; font-weight: 600; margin-top: 3px;">
                <i class="far fa-calendar-check"></i> Guaranteed Delivery by <strong>${standardDateStr}</strong> (4–5 business days)
              </div>
            </div>
            <div style="font-weight: 700; color: ${checkoutState.quote.freeShippingThreshold && (checkoutState.quote.sellingSubtotal >= checkoutState.quote.freeShippingThreshold) ? 'var(--accent)' : 'var(--text-main)'};">
              ${checkoutState.quote.freeShippingThreshold && (checkoutState.quote.sellingSubtotal >= checkoutState.quote.freeShippingThreshold) ? 'FREE' : '₹70'}
            </div>
          </label>

          <label style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem; border: 2px solid ${checkoutState.deliveryMethod === 'express' ? 'var(--primary)' : 'var(--surface-border)'}; background: ${checkoutState.deliveryMethod === 'express' ? 'var(--primary-light)' : '#fff'}; border-radius: var(--radius-md); cursor: pointer;">
            <input type="radio" name="delivery_method" value="express" ${checkoutState.deliveryMethod === 'express' ? 'checked' : ''} onchange="changeDeliveryMethod('express')" />
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="font-size: 1rem;">Express Priority Delivery</strong>
                <span class="badge badge-primary" style="font-size: 0.72rem;">Fastest</span>
              </div>
              <div style="font-size: 0.85rem; color: #b45309; font-weight: 600; margin-top: 3px;">
                <i class="fas fa-bolt"></i> Dispatched same day. Arrives by <strong>${expressDateStr}</strong> (1–2 business days)
              </div>
            </div>
            <div style="font-weight: 700;">₹150</div>
          </label>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button class="btn btn-secondary" onclick="setCheckoutStep(2)"><i class="fas fa-arrow-left"></i> Back to Address</button>
          <button class="btn btn-primary" onclick="setCheckoutStep(4)">
            Continue to Order Summary <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  } else if (step === 4) {
    // Step 4: Order Summary & Review before payment
    const standardDateStr = checkoutState.quote?.standardDeliveryDate
      ? formatDeliveryDate(checkoutState.quote.standardDeliveryDate)
      : formatDeliveryDate(getEstimatedDeliveryDate('standard'));
    const expressDateStr = checkoutState.quote?.expressDeliveryDate
      ? formatDeliveryDate(checkoutState.quote.expressDeliveryDate)
      : formatDeliveryDate(getEstimatedDeliveryDate('express'));
    const activeDateStr = checkoutState.deliveryMethod === 'express' ? expressDateStr : standardDateStr;

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 2rem;">
        <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 1.5rem;">Step 4: Final Order Verification</h3>

        <div style="background: var(--surface-alt); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;"><i class="fas fa-map-marker-alt" style="color: var(--primary);"></i> Delivering to:</h4>
          <div style="font-size: 0.9rem; color: var(--text-main);">
            <strong>${checkoutState.selectedAddress.fullName}</strong> (${checkoutState.selectedAddress.phone})<br/>
            ${checkoutState.selectedAddress.street}, ${checkoutState.selectedAddress.city}, ${checkoutState.selectedAddress.state} - ${checkoutState.selectedAddress.postalCode}
          </div>
        </div>

        <div style="background: var(--surface-alt); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 2rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;"><i class="fas fa-truck-fast" style="color: var(--primary);"></i> Shipping & Estimated Delivery:</h4>
          <div style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 6px;">
            Method: <strong>${checkoutState.deliveryMethod === 'express' ? 'Express Priority Delivery (1–2 Days, ₹150)' : 'Standard Delivery (4–5 Days)'}</strong>
          </div>
          <div style="font-size: 0.95rem; color: #047857; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <i class="far fa-calendar-check"></i> Guaranteed Arrival: <strong>${activeDateStr}</strong>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button class="btn btn-secondary" onclick="setCheckoutStep(3)"><i class="fas fa-arrow-left"></i> Back to Shipping</button>
          <button class="btn btn-primary btn-lg" onclick="setCheckoutStep(5)">
            Proceed to Payment <i class="fas fa-shield-alt"></i>
          </button>
        </div>
      </div>
    `;
  } else if (step === 5) {
    // Step 5: Razorpay Payment Initiation
    const standardDateStr = checkoutState.quote?.standardDeliveryDate
      ? formatDeliveryDate(checkoutState.quote.standardDeliveryDate)
      : formatDeliveryDate(getEstimatedDeliveryDate('standard'));
    const expressDateStr = checkoutState.quote?.expressDeliveryDate
      ? formatDeliveryDate(checkoutState.quote.expressDeliveryDate)
      : formatDeliveryDate(getEstimatedDeliveryDate('express'));
    const activeDateStr = checkoutState.deliveryMethod === 'express' ? expressDateStr : standardDateStr;

    container.innerHTML = `
      <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 2.5rem; text-align: center;">
        <div style="width: 70px; height: 70px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.5rem;">
          <i class="fas fa-credit-card"></i>
        </div>

        <h3 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem;">Secure Payment via Razorpay</h3>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.75rem;">
          Supports UPI (Google Pay, PhonePe, Paytm), All Major Debit/Credit Cards, and Net Banking.
        </p>

        <div style="max-width: 380px; margin: 0 auto 2rem; background: var(--surface-alt); padding: 1.25rem; border-radius: var(--radius-md); text-align: left;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>Total Payable Amount</span>
            <strong style="font-size: 1.2rem; color: var(--primary);">${formatCurrency(checkoutState.quote.finalTotal)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
            <span>Inclusive of all taxes</span>
            <span>Test Mode Active</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #047857; margin-top: 8px; border-top: 1px dashed var(--surface-border); padding-top: 6px; font-weight: 600;">
            <span><i class="fas fa-truck-fast"></i> Guaranteed Delivery</span>
            <strong>${activeDateStr}</strong>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; max-width: 380px; margin: 0 auto;">
          <button id="pay-now-btn" class="btn btn-primary btn-lg btn-block" onclick="launchRazorpayCheckout()">
            <i class="fas fa-lock"></i> Pay ${formatCurrency(checkoutState.quote.finalTotal)} Now
          </button>
          <button class="btn btn-secondary btn-sm" onclick="setCheckoutStep(4)">
            Change Payment Details / Back
          </button>
        </div>
      </div>
    `;
  }
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-sidebar-summary');
  if (!container || !checkoutState.quote) return;

  const q = checkoutState.quote;
  const activeDate = checkoutState.deliveryMethod === 'express'
    ? (q.expressDeliveryDate ? formatDeliveryDate(q.expressDeliveryDate) : formatDeliveryDate(getEstimatedDeliveryDate('express')))
    : (q.standardDeliveryDate ? formatDeliveryDate(q.standardDeliveryDate) : formatDeliveryDate(getEstimatedDeliveryDate('standard')));

  container.innerHTML = `
    <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: 1.75rem; box-shadow: var(--shadow-sm); position: sticky; top: 96px;">
      <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 1rem; border-bottom: 1px solid var(--surface-border); padding-bottom: 0.75rem;">
        Order Total
      </h3>

      <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Original Subtotal</span>
          <span>${formatCurrency(q.originalSubtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: var(--accent);">
          <span>Product Savings</span>
          <span>-${formatCurrency(q.productDiscount)}</span>
        </div>
        ${q.couponDiscount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: var(--primary); font-weight: 700;">
            <span>Coupon (${q.couponApplied?.code})</span>
            <span>-${formatCurrency(q.couponDiscount)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Delivery Fee</span>
          <span>${q.shippingFee === 0 ? '<strong style="color: var(--accent);">FREE</strong>' : formatCurrency(q.shippingFee)}</span>
        </div>

        <div style="border-top: 1px dashed var(--surface-border); padding-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
          <div style="display: flex; justify-content: space-between;">
            <span>GST Tax (CGST + SGST)</span>
            <span>${formatCurrency(q.taxBreakdown?.totalTax || 0)}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 2px solid var(--surface-border); padding-top: 0.75rem; font-size: 1.25rem; font-weight: 800;">
          <span>Payable Amount</span>
          <span style="color: var(--primary);">${formatCurrency(q.finalTotal)}</span>
        </div>

        <div style="margin-top: 0.85rem; padding: 10px 12px; background: var(--accent-light); border-radius: var(--radius-md); display: flex; align-items: center; gap: 8px; font-size: 0.825rem; color: #047857; font-weight: 700;">
          <i class="fas fa-truck-fast"></i>
          <span>Est. Delivery: <strong>${activeDate}</strong></span>
        </div>
      </div>
    </div>
  `;
}

function selectAddress(addressId) {
  const addr = checkoutState.addresses.find(a => a._id === addressId);
  if (addr) {
    checkoutState.selectedAddress = addr;
    renderCheckoutStep(2);
  }
}

function validateAddressAndProceed() {
  if (!checkoutState.selectedAddress) {
    if (checkoutState.addresses.length > 0) {
      checkoutState.selectedAddress = checkoutState.addresses[0];
    } else {
      showToast('Please add a delivery address to proceed', 'warning');
      return;
    }
  }
  setCheckoutStep(3);
}

async function changeDeliveryMethod(method) {
  checkoutState.deliveryMethod = method;
  await refreshQuote();
  renderCheckoutStep(3);
}

/**
 * Launch Razorpay Checkout with Test Mode Verification & Simulation Fallback
 */
async function launchRazorpayCheckout() {
  const payBtn = document.getElementById('pay-now-btn');
  if (payBtn) {
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing Gateway...';
  }

  try {
    // 1. Create Razorpay order on backend
    const orderPayload = {
      deliveryMethod: checkoutState.deliveryMethod,
      couponCode: checkoutState.quote.couponApplied?.code,
      items: checkoutState.quote.items.map(i => ({
        product: i.product,
        quantity: i.quantity,
        size: i.size,
        color: i.color
      }))
    };

    const paymentOrderRes = await api.post('/payments/create-order', orderPayload);
    const { keyId, razorpayOrderId, amount, currency, isSimulated } = paymentOrderRes;

    const user = auth.getUser();

    // 2. Open Simulated Payment Modal if running in simulation or if Razorpay script is blocked
    if (isSimulated || typeof Razorpay === 'undefined') {
      openPaymentSimulationModal(razorpayOrderId, amount);
      return;
    }

    // 3. Real Razorpay Checkout integration
    const options = {
      key: keyId,
      amount: amount,
      currency: currency || 'INR',
      name: 'ShopSphere E-Commerce',
      description: 'Online Shopping Order Checkout',
      order_id: razorpayOrderId,
      prefill: {
        name: checkoutState.selectedAddress.fullName || user.name,
        email: user.email,
        contact: checkoutState.selectedAddress.phone || user.phone
      },
      theme: {
        color: '#4f46e5'
      },
      handler: async function (response) {
        await verifyAndFinalizePayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
          'Razorpay Gateway'
        );
      },
      modal: {
        ondismiss: function () {
          showToast('Payment was cancelled. You can retry when ready.', 'info');
          if (payBtn) {
            payBtn.disabled = false;
            payBtn.innerHTML = `<i class="fas fa-lock"></i> Pay ${formatCurrency(checkoutState.quote.finalTotal)} Now`;
          }
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      showToast(`Payment failed: ${response.error.description}`, 'error');
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = `<i class="fas fa-redo"></i> Retry Payment`;
      }
    });

    rzp.open();
  } catch (err) {
    showToast(err.message, 'error');
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.innerHTML = `<i class="fas fa-lock"></i> Pay ${formatCurrency(checkoutState.quote.finalTotal)} Now`;
    }
  }
}

/**
 * Interactive Test Simulation Modal for end-to-end testing without real bank credentials
 */
function openPaymentSimulationModal(razorpayOrderId, amount) {
  let modal = document.getElementById('payment-sim-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'payment-sim-modal';
    modal.className = 'modal-overlay active';
    document.body.appendChild(modal);
  } else {
    modal.className = 'modal-overlay active';
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header" style="background: #0f172a; color: #fff;">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-shield-alt" style="color: #10b981;"></i> Razorpay Test Mode Simulator
        </h3>
        <button class="modal-close-btn" style="color: #fff;" onclick="closePaymentSimModal()">&times;</button>
      </div>

      <div class="modal-body" style="padding: 1.75rem;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 12px; margin-bottom: 1.25rem; font-size: 0.85rem; color: #1e40af;">
          <strong>Test Mode Gateway Active:</strong> Select an interactive payment method below to simulate genuine Razorpay signature verification on the server.
        </div>

        <div style="font-weight: 700; margin-bottom: 0.8rem;">Select Test Payment Method:</div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.5rem;">
          <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md); cursor: pointer;">
            <input type="radio" name="sim_method" value="UPI (Google Pay / PhonePe)" checked />
            <i class="fas fa-mobile-alt" style="font-size: 1.2rem; color: var(--primary);"></i>
            <div>
              <strong>UPI / QR Code</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Instant zero-fee transfer</div>
            </div>
          </label>

          <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md); cursor: pointer;">
            <input type="radio" name="sim_method" value="Credit / Debit Card (Visa/Mastercard)" />
            <i class="fas fa-credit-card" style="font-size: 1.2rem; color: var(--accent);"></i>
            <div>
              <strong>Credit / Debit Card</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Visa, Mastercard, RuPay</div>
            </div>
          </label>

          <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1.5px solid var(--surface-border); border-radius: var(--radius-md); cursor: pointer;">
            <input type="radio" name="sim_method" value="Net Banking (HDFC/ICICI/SBI)" />
            <i class="fas fa-building-columns" style="font-size: 1.2rem; color: #0284c7;"></i>
            <div>
              <strong>Net Banking</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Top 50 Indian Banks</div>
            </div>
          </label>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-primary btn-block" onclick="completeSimulatedPayment('${razorpayOrderId}', true)">
            <i class="fas fa-check-circle"></i> Simulate Successful Payment
          </button>
          <button class="btn btn-danger btn-block" onclick="completeSimulatedPayment('${razorpayOrderId}', false)">
            <i class="fas fa-times-circle"></i> Simulate Payment Failure
          </button>
        </div>
      </div>
    </div>
  `;
}

function closePaymentSimModal() {
  const modal = document.getElementById('payment-sim-modal');
  if (modal) modal.className = 'modal-overlay';
  const payBtn = document.getElementById('pay-now-btn');
  if (payBtn) {
    payBtn.disabled = false;
    payBtn.innerHTML = `<i class="fas fa-lock"></i> Pay ${formatCurrency(checkoutState.quote.finalTotal)} Now`;
  }
}

async function completeSimulatedPayment(razorpayOrderId, isSuccess) {
  if (!isSuccess) {
    showToast('Simulated Payment Failed. Transaction was aborted.', 'error');
    closePaymentSimModal();
    return;
  }

  const selectedMethod = document.querySelector('input[name="sim_method"]:checked')?.value || 'UPI';
  const mockPaymentId = `pay_sim_${Date.now()}`;
  const mockSignature = `sim_sig_${Date.now()}`;

  closePaymentSimModal();
  await verifyAndFinalizePayment(razorpayOrderId, mockPaymentId, mockSignature, selectedMethod);
}

/**
 * Server-Side Authoritative Signature Verification & Order Finalization
 */
async function verifyAndFinalizePayment(razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod) {
  const container = document.getElementById('checkout-step-content');
  if (container) {
    container.innerHTML = `
      <div style="background: #ffffff; border-radius: var(--radius-lg); padding: 4rem 2rem; text-align: center;">
        <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 1.5rem;"></i>
        <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">Verifying Payment Signature...</h3>
        <p style="color: var(--text-muted);">Securing inventory and generating your official order invoice.</p>
      </div>
    `;
  }

  try {
    const res = await api.post('/payments/verify', {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      shippingAddress: checkoutState.selectedAddress,
      deliveryMethod: checkoutState.deliveryMethod,
      couponCode: checkoutState.quote.couponApplied?.code,
      paymentMethod,
      items: checkoutState.quote.items
    });

    // Order Success! Render Step 6 Confirmation
    renderOrderConfirmation(res.order);
    updateCartBadge();
  } catch (err) {
    showToast(`Payment Verification Failed: ${err.message}`, 'error');
    setCheckoutStep(5);
  }
}

function renderOrderConfirmation(order) {
  setCheckoutStep(6);
  const container = document.getElementById('checkout-step-content');
  const sidebar = document.getElementById('checkout-sidebar-summary');
  if (sidebar) sidebar.style.display = 'none';

  if (!container) return;

  container.innerHTML = `
    <div style="background: #ffffff; border: 1px solid var(--surface-border); border-radius: var(--radius-xl); padding: 3rem 2rem; text-align: center; max-width: 720px; margin: 0 auto; box-shadow: var(--shadow-md);">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--accent-light); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 1.5rem;">
        <i class="fas fa-check-circle"></i>
      </div>

      <span class="badge badge-success" style="font-size: 0.85rem; padding: 6px 14px; margin-bottom: 1rem;">
        Payment Verified & Order Confirmed
      </span>

      <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">
        Thank You For Your Order!
      </h2>
      <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 2rem;">
        Order confirmation has been sent to your registered email address.
      </p>

      <div style="background: var(--surface-alt); border-radius: var(--radius-md); padding: 1.5rem; text-align: left; margin-bottom: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Order Reference</span>
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${order.orderNumber}</div>
        </div>
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Invoice Number</span>
          <div style="font-size: 1.1rem; font-weight: 800;">${order.invoiceNumber}</div>
        </div>
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total Amount Paid</span>
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent);">${formatCurrency(order.totalAmount)}</div>
        </div>
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Estimated Delivery</span>
          <div style="font-size: 1.1rem; font-weight: 800;">
            ${new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a href="order-details.html?id=${order._id}" class="btn btn-primary btn-lg">
          <i class="fas fa-location-arrow"></i> Track My Order
        </a>
        <a href="shop.html" class="btn btn-secondary btn-lg">
          <i class="fas fa-shopping-bag"></i> Continue Shopping
        </a>
      </div>
    </div>
  `;
}

function openNewAddressModal() {
  const modal = document.getElementById('address-modal');
  if (modal) modal.classList.add('active');
}

function closeNewAddressModal() {
  const modal = document.getElementById('address-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveNewAddress(e) {
  e.preventDefault();
  const fullName = document.getElementById('addr-name').value;
  const phone = document.getElementById('addr-phone').value;
  const street = document.getElementById('addr-street').value;
  const apartment = document.getElementById('addr-apt').value;
  const city = document.getElementById('addr-city').value;
  const state = document.getElementById('addr-state').value;
  const postalCode = document.getElementById('addr-pin').value;
  const isDefault = document.getElementById('addr-default')?.checked || false;

  try {
    const res = await api.post('/auth/addresses', {
      fullName, phone, street, apartment, city, state, postalCode, isDefault
    });

    checkoutState.addresses = res.addresses;
    checkoutState.selectedAddress = res.addresses[res.addresses.length - 1];

    closeNewAddressModal();
    showToast('New address saved', 'success');
    renderCheckoutStep(2);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initCheckout);
