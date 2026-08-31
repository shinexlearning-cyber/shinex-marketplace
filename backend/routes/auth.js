const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase/client');
const { body, validationResult } = require('express-validator');

// Register
router.post('/register', [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('terms').isBoolean().custom(value => value === true).withMessage('Terms must be accepted')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { full_name, username, email, phone, password } = req.body;

        // Check if username exists
        const { data: existingUsername } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        // Check if email exists
        const { data: existingEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert([{
                full_name,
                username,
                email,
                phone,
                password_hash: passwordHash,
                is_admin: false,
                suspended: false
            }])
            .select()
            .single();

        if (error) {
            console.error('Registration error:', error);
            return res.status(500).json({ error: 'Failed to create user' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove password from response
        delete user.password_hash;

        res.status(201).json({
            message: 'Registration successful',
            token,
            user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Get user with password
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if suspended
        if (user.suspended) {
            return res.status(403).json({ error: 'Account has been suspended' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove password from response
        delete user.password_hash;

        res.json({
            message: 'Login successful',
            token,
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'User not found' });
        }

        delete user.password_hash;
        res.json({ user });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;