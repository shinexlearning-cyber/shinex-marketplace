const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../supabase/client');
const { validate, schemas } = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Register new user
router.post('/register', validate(schemas.register), async (req, res) => {
  try {
    const { full_name, username, email, phone, password } = req.body;

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`);

    if (checkError) {
      console.error('Check user error:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Error checking user existence'
      });
    }

    if (existingUser && existingUser.length > 0) {
      const duplicate = existingUser[0];
      if (duplicate.email === email) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered. Please use a different email.'
        });
      }
      if (duplicate.username === username) {
        return res.status(409).json({
          success: false,
          message: 'Username already taken. Please choose a different username.'
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert([
        {
          full_name,
          username,
          email,
          phone,
          password_hash
        }
      ])
      .select('id, username, email, full_name, phone, avatar_url, is_admin')
      .single();

    if (createError) {
      console.error('Create user error:', createError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create account. Please try again.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to SHINEX Marketplace.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          avatar_url: user.avatar_url,
          is_admin: user.is_admin
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.'
    });
  }
});

// Login user
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check if user is suspended
    if (user.is_suspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful! Welcome back.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          avatar_url: user.avatar_url,
          bio: user.bio,
          location: user.location,
          whatsapp: user.whatsapp,
          shop_name: user.shop_name,
          shop_description: user.shop_description,
          is_admin: user.is_admin
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.'
    });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password hash
    delete user.password_hash;

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (error || !user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    await supabase
      .from('users')
      .update({ reset_token: resetToken })
      .eq('id', user.id);

    // In a production environment, send email with reset link
    // For now, return the token (in production, this should be emailed)
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
      // Only include token in development
      ...(process.env.NODE_ENV === 'development' && { reset_token: resetToken })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new one.'
      });
    }

    // Get user by id
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify reset token matches
    if (user.reset_token !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update password and clear reset token
    await supabase
      .from('users')
      .update({ 
        password_hash,
        reset_token: null
      })
      .eq('id', user.id);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;
