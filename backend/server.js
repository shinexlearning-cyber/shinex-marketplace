require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const favoriteRoutes = require('./routes/favorites');
const advertisementRoutes = require('./routes/advertisements');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - Allow frontend domains
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://shinex.onrender.com',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log(`Serving frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'SHINEX API is running', timestamp: new Date().toISOString() });
});

// Serve index.html for all non-API routes (SPA)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Error loading application');
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SHINEX backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5000'}`);
});

module.exports = app;