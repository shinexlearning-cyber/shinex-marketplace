import express from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase/client.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, username, email, phone, password } = req.body;

    // Validate
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        full_name: fullName,
        username,
        email,
        phone,
        password_hash: hashedPassword,
        role: 'user',
      })
      .select('id, full_name, username, email, phone, role, avatar')
      .single();

    if (error) throw error;

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        whatsapp: user.whatsapp,
        shopName: user.shop_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      whatsapp: user.whatsapp,
      shopName: user.shop_name,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // In production, send email with reset link
    // For now, just return success
    res.json({ message: 'If an account exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reset link' });
  }
});

export default router;
