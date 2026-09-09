const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { getPagination } = require('../../utils/helpers');
const router = express.Router();

// All routes require authentication and admin privileges
router.use(authMiddleware, adminMiddleware);

// Get all users with pagination and search
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20, status } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (status === 'suspended') {
      query = query.eq('is_suspended', true);
    } else if (status === 'active') {
      query = query.eq('is_suspended', false);
    }

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }

    // Remove sensitive data
    const sanitizedUsers = users.map(user => {
      delete user.password_hash;
      delete user.reset_token;
      return user;
    });

    res.json({
      success: true,
      data: sanitizedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    delete user.password_hash;
    delete user.reset_token;

    // Get user stats
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    const { count: adCount } = await supabase
      .from('advertisements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    const { count: reportCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_id', id);

    res.json({
      success: true,
      data: {
        ...user,
        stats: {
          products: productCount || 0,
          advertisements: adCount || 0,
          reports: reportCount || 0
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Suspend user
router.patch('/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Prevent admin from suspending themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot suspend your own account'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        is_suspended: true,
        suspension_reason: reason || 'No reason provided',
        suspended_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, username, full_name, email, is_suspended')
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User suspended successfully',
      data: user
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user'
    });
  }
});

// Unsuspend user
router.patch('/:id/unsuspend', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .update({
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null
      })
      .eq('id', id)
      .select('id, username, full_name, email, is_suspended')
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User unsuspended successfully',
      data: user
    });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsuspend user'
    });
  }
});

// Delete user (admin only - hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Check if user exists
    const { data: user, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user (cascade will handle related records)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

module.exports = router;
