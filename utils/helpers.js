// Generate slug from string
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Format currency
const formatCurrency = (amount, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
};

// Calculate pagination
const getPagination = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return { offset, limit: Math.min(limit, 100) };
};

// Build pagination response
const buildPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Validate UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Sanitize input
const sanitize = (text) => {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

// Check if date is expired
const isExpired = (date) => {
  return new Date(date) < new Date();
};

// Add days to date
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// SHINEX plan -> max ACTIVE listings. Enterprise = unlimited (null).
const PLAN_LISTING_LIMITS = {
  starter: 5,
  pro: 30,
  enterprise: null
};

// Resolve a user's effective plan. If a paid plan has expired, the user
// falls back to 'starter' — the backend, not the frontend, is the source
// of truth for this (Part 11 / Part 18).
const getEffectivePlan = (user) => {
  if (!user) return 'starter';
  if (user.plan && user.plan !== 'starter') {
    if (user.plan_expires_at && new Date(user.plan_expires_at) < new Date()) {
      return 'starter';
    }
    return user.plan;
  }
  return 'starter';
};

const getListingLimit = (user) => {
  const plan = getEffectivePlan(user);
  return PLAN_LISTING_LIMITS[plan] ?? PLAN_LISTING_LIMITS.starter;
};

// Normalize a Nigerian (or generic) phone number into E.164-ish
// international format for WhatsApp deep links (Part 9).
// Returns { valid, normalized, error }.
const normalizeWhatsApp = (raw) => {
  if (!raw || !String(raw).trim()) {
    return { valid: true, normalized: null }; // optional field
  }

  let digits = String(raw).trim().replace(/[\s\-().]/g, '');

  if (digits.startsWith('+')) {
    digits = '+' + digits.slice(1).replace(/[^0-9]/g, '');
  } else {
    digits = digits.replace(/[^0-9]/g, '');
  }

  // Nigerian local format: 0XXXXXXXXXX (11 digits) -> +234XXXXXXXXXX
  if (/^0[0-9]{10}$/.test(digits)) {
    digits = '+234' + digits.slice(1);
  } else if (/^234[0-9]{10}$/.test(digits)) {
    digits = '+' + digits;
  } else if (!digits.startsWith('+')) {
    // Unknown local format without a country code — reject rather than guess.
    return {
      valid: false,
      normalized: null,
      error: 'WhatsApp number must include a country code, e.g. +2348012345678'
    };
  }

  // E.164: '+' followed by 8-15 digits
  if (!/^\+[1-9][0-9]{7,14}$/.test(digits)) {
    return {
      valid: false,
      normalized: null,
      error: 'Enter a valid WhatsApp number in international format, e.g. +2348012345678'
    };
  }

  return { valid: true, normalized: digits };
};

module.exports = {
  generateSlug,
  formatCurrency,
  getPagination,
  buildPaginationResponse,
  isValidUUID,
  sanitize,
  isExpired,
  addDays,
  PLAN_LISTING_LIMITS,
  getEffectivePlan,
  getListingLimit,
  normalizeWhatsApp
};
