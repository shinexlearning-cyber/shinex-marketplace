const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { uploadImage, deleteImage } = require('../services/cloudinary');
const { getPagination, buildPaginationResponse, isValidUUID } = require('../utils/helpers');
const router = express.Router();

// Get current user profile (authenticated)
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

    delete user.password_hash;
    delete user.reset_token;

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Get public user profile by username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Get user profile
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, bio, location, whatsapp, avatar_url, shop_name, shop_description, created_at')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get product count
    const { count: productCount, error: productCountError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (productCountError) {
      console.error('Product count error:', productCountError);
    }

    // Get shop information
    const shopData = {
      shop_name: user.shop_name || user.username,
      shop_description: user.shop_description || null,
      product_count: productCount || 0,
      username: user.username,
      profile_picture: user.avatar_url,
      bio: user.bio,
      location: user.location,
      whatsapp: user.whatsapp
    };

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          location: user.location,
          whatsapp: user.whatsapp,
          created_at: user.created_at
        },
        shop: shopData
      }
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Get user's shop
router.get('/:username/shop', async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, full_name, bio, location, whatsapp, avatar_url, shop_name, shop_description')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    // Get products
    const { data: products, error: productsError, count } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name, slug),
        images:product_images(*)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (productsError) {
      console.error('Products fetch error:', productsError);
    }

    // Format products
    const formattedProducts = (products || []).map(product => ({
      ...product,
      primary_image: product.images?.find(img => img.is_primary)?.image_url || 
                     product.images?.[0]?.image_url || null
    }));

    res.json({
      success: true,
      data: {
        shop: {
          shop_name: user.shop_name || user.username,
          shop_description: user.shop_description || null,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          location: user.location,
          whatsapp: user.whatsapp,
          product_count: count || 0
        },
        products: formattedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(pageLimit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageLimit)
        }
      }
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop'
    });
  }
});

// GET /api/users/me/stats - User statistics
router.get('/me/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Count products
    const { count: productsCount, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (productsError) {
      console.error('Products count error:', productsError);
    }

    // Count favorites (both products and sellers)
    const { count: favoritesCount, error: favoritesError } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (favoritesError) {
      console.error('Favorites count error:', favoritesError);
    }

    // Sum of views across all user's products
    const { data: viewsData, error: viewsError } = await supabase
      .from('products')
      .select('views_count')
      .eq('user_id', userId);

    if (viewsError) {
      console.error('Views count error:', viewsError);
    }

    const totalViews = viewsData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        products: productsCount || 0,
        favorites: favoritesCount || 0,
        views: totalViews
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Update profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { full_name, bio, location, whatsapp, shop_name, shop_description } = req.body;

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (shop_name !== undefined) updates.shop_name = shop_name;
    if (shop_description !== undefined) updates.shop_description = shop_description;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }

    delete user.password_hash;
    delete user.reset_token;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Upload profile picture
router.post('/me/avatar', authMiddleware, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Get current user
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('avatar_public_id')
      .eq('id', req.user.id)
      .single();

    if (userError) {
      console.error('Get user error:', userError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update avatar'
      });
    }

    // Delete old avatar if exists
    if (currentUser?.avatar_public_id) {
      try {
        await deleteImage(currentUser.avatar_public_id);
      } catch (error) {
        console.error('Delete old avatar error:', error);
        // Continue even if delete fails
      }
    }

    // Upload new avatar
    const result = await uploadImage(req.file.buffer, 'shinex_avatars');

    // Update user
    const { data: user, error } = await supabase
      .from('users')
      .update({
        avatar_url: result.url,
        avatar_public_id: result.publicId
      })
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Update avatar error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update avatar'
      });
    }

    delete user.password_hash;

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture'
    });
  }
});

// Get user's products
router.get('/:userId/products', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    if (!isValidUUID(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const { data: products, error, count } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name, slug),
        images:product_images(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get user products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products'
      });
    }

    // Format products with primary image
    const formattedProducts = (products || []).map(product => ({
      ...product,
      primary_image: product.images?.find(img => img.is_primary)?.image_url || 
                     product.images?.[0]?.image_url || null
    }));

    res.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get user products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user products'
    });
  }
});

module.exports = router;
