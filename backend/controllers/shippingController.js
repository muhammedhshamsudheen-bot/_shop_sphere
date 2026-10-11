/**
 * Shipping & PIN Code Delivery Controller
 */

const PIN_REGION_MAP = [
  { prefix: '11', city: 'New Delhi & NCR', state: 'Delhi', metro: true },
  { prefix: '12', city: 'Gurugram / Faridabad', state: 'Haryana', metro: true },
  { prefix: '13', city: 'Ambala / Panipat', state: 'Haryana', metro: false },
  { prefix: '14', city: 'Amritsar / Jalandhar', state: 'Punjab', metro: false },
  { prefix: '16', city: 'Chandigarh', state: 'Punjab & Haryana', metro: true },
  { prefix: '17', city: 'Shimla', state: 'Himachal Pradesh', metro: false },
  { prefix: '18', city: 'Jammu', state: 'Jammu & Kashmir', metro: false },
  { prefix: '19', city: 'Srinagar', state: 'Jammu & Kashmir', metro: false },
  { prefix: '20', city: 'Noida / Ghaziabad', state: 'Uttar Pradesh', metro: true },
  { prefix: '21', city: 'Prayagraj', state: 'Uttar Pradesh', metro: false },
  { prefix: '22', city: 'Lucknow', state: 'Uttar Pradesh', metro: false },
  { prefix: '24', city: 'Dehradun', state: 'Uttarakhand', metro: false },
  { prefix: '28', city: 'Agra', state: 'Uttar Pradesh', metro: false },
  { prefix: '30', city: 'Jaipur', state: 'Rajasthan', metro: false },
  { prefix: '38', city: 'Ahmedabad', state: 'Gujarat', metro: true },
  { prefix: '39', city: 'Surat / Vadodara', state: 'Gujarat', metro: false },
  { prefix: '40', city: 'Mumbai', state: 'Maharashtra', metro: true },
  { prefix: '41', city: 'Pune', state: 'Maharashtra', metro: true },
  { prefix: '44', city: 'Nagpur', state: 'Maharashtra', metro: false },
  { prefix: '45', city: 'Indore', state: 'Madhya Pradesh', metro: false },
  { prefix: '46', city: 'Bhopal', state: 'Madhya Pradesh', metro: false },
  { prefix: '50', city: 'Hyderabad', state: 'Telangana', metro: true },
  { prefix: '51', city: 'Tirupati', state: 'Andhra Pradesh', metro: false },
  { prefix: '53', city: 'Visakhapatnam', state: 'Andhra Pradesh', metro: false },
  { prefix: '56', city: 'Bengaluru', state: 'Karnataka', metro: true },
  { prefix: '57', city: 'Mangaluru', state: 'Karnataka', metro: false },
  { prefix: '58', city: 'Hubballi', state: 'Karnataka', metro: false },
  { prefix: '60', city: 'Chennai', state: 'Tamil Nadu', metro: true },
  { prefix: '64', city: 'Coimbatore', state: 'Tamil Nadu', metro: false },
  { prefix: '682', city: 'Kochi (Ernakulam)', state: 'Kerala', metro: true },
  { prefix: '695', city: 'Thiruvananthapuram', state: 'Kerala', metro: false },
  { prefix: '67', city: 'Kozhikode', state: 'Kerala', metro: false },
  { prefix: '68', city: 'Kochi & Central Kerala', state: 'Kerala', metro: false },
  { prefix: '69', city: 'Kollam / South Kerala', state: 'Kerala', metro: false },
  { prefix: '70', city: 'Kolkata', state: 'West Bengal', metro: true },
  { prefix: '75', city: 'Bhubaneswar', state: 'Odisha', metro: false },
  { prefix: '78', city: 'Guwahati', state: 'Assam', metro: false },
  { prefix: '80', city: 'Patna', state: 'Bihar', metro: false },
  { prefix: '83', city: 'Ranchi', state: 'Jharkhand', metro: false }
];

function resolvePincodeLocation(pin) {
  // Check 3-digit match first, then 2-digit match
  const match3 = PIN_REGION_MAP.find(m => pin.startsWith(m.prefix) && m.prefix.length === 3);
  if (match3) return match3;
  const match2 = PIN_REGION_MAP.find(m => pin.startsWith(m.prefix) && m.prefix.length === 2);
  if (match2) return match2;

  // Generic regional fallback based on first digit
  const firstDigitMap = {
    '1': { city: 'Northern Zone', state: 'Delhi / Punjab / Haryana' },
    '2': { city: 'Central-North Zone', state: 'Uttar Pradesh / Uttarakhand' },
    '3': { city: 'Western Zone', state: 'Rajasthan / Gujarat' },
    '4': { city: 'West-Central Zone', state: 'Maharashtra / MP' },
    '5': { city: 'South-Central Zone', state: 'Karnataka / Telangana / AP' },
    '6': { city: 'Southern Zone', state: 'Kerala / Tamil Nadu' },
    '7': { city: 'Eastern Zone', state: 'West Bengal / North East' },
    '8': { city: 'East-Central Zone', state: 'Bihar / Jharkhand' }
  };
  const fallback = firstDigitMap[pin[0]] || { city: 'India Delivery Zone', state: 'All India' };
  return { ...fallback, metro: false };
}

// @desc Estimate delivery date and check serviceability by postal PIN code
// @route GET /api/shipping/estimate?pincode=682011
exports.estimateDelivery = (req, res) => {
  const pincode = String(req.query.pincode || req.params.pincode || '').trim();

  // Validate standard Indian 6-digit PIN code
  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return res.status(400).json({
      success: false,
      serviceable: false,
      message: 'Please enter a valid 6-digit postal PIN code.'
    });
  }

  const location = resolvePincodeLocation(pincode);
  const now = new Date();

  // Standard delivery: Metro gets 3-4 days, Non-metro gets 4-5 days
  const standardDays = location.metro ? 3 : 5;
  const expressDays = location.metro ? 1 : 2;

  const standardDate = new Date(now.getTime() + standardDays * 24 * 60 * 60 * 1000);
  const expressDate = new Date(now.getTime() + expressDays * 24 * 60 * 60 * 1000);

  // Dispatch cutoff: 7:00 PM today
  const cutoffHour = 19;
  const currentHour = now.getHours();
  const hoursLeft = Math.max(1, cutoffHour - currentHour);

  res.status(200).json({
    success: true,
    pincode,
    serviceable: true,
    location: {
      city: location.city,
      state: location.state,
      isMetro: location.metro
    },
    delivery: {
      standard: {
        days: standardDays,
        date: standardDate,
        formatted: standardDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        fee: 0,
        label: 'FREE Delivery'
      },
      express: {
        days: expressDays,
        date: expressDate,
        formatted: expressDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        fee: 150,
        label: 'Express Priority',
        orderCutoffNotice: hoursLeft > 0 && currentHour < cutoffHour
          ? `Order within ${hoursLeft} hrs for fastest dispatch`
          : 'Dispatched next business morning'
      }
    },
    features: {
      codAvailable: true,
      freeShippingEligible: true,
      returnDays: 7,
      openBoxDelivery: location.metro
    }
  });
};
