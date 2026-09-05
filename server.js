require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { supabase } = require('./supabase/client');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const favoriteRoutes = require('./routes/favorites');
const advertisementRoutes = require('./routes/advertisements');
const reportRoutes = require('./routes/reports');
const contactRoutes = require('./routes/contact');
const activityRoutes = require('./routes/activity');

// Import admin routes
const adminUserRoutes = require('./routes/admin/users');
const adminProductRoutes = require('./routes/admin/products');
const adminCategoryRoutes = require('./routes/admin/categories');
const adminAdRoutes = require('./routes/admin/advertisements');
const adminDurationRoutes = require('./routes/admin/durations');
const adminPaymentRoutes = require('./routes/admin/payments');
const adminReportRoutes = require('./routes/admin/reports');
const adminContactRoutes = require('./routes/admin/contact');

const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
// FRONTEND_URL should be set in the environment, but the known production
// frontend origin is included explicitly as a safety net so a missing/
// misconfigured env var can never silently lock out the real SHINEX app.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'https://shinexmarket.onrender.com',
  'https://shinex-marketplace.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
// The `verify` hook stashes the exact raw request bytes onto req.rawBody.
// This is required by the Paystack webhook handler (routes/advertisements.js)
// to verify the x-paystack-signature header — that check must run against
// the untouched raw bytes, not a re-serialized copy of the parsed body,
// or the HMAC will never match.
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SHINEX Marketplace API is running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/activity', activityRoutes);

// Admin routes
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/advertisements', adminAdRoutes);
app.use('/api/admin/durations', adminDurationRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/reports', adminReportRoutes);
app.use('/api/admin/contact', adminContactRoutes);

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SHINEX Marketplace API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
