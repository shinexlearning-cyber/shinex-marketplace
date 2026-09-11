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

module.exports = {
  generateSlug,
  formatCurrency,
  getPagination,
  buildPaginationResponse,
  isValidUUID,
  sanitize,
  isExpired,
  addDays
};
