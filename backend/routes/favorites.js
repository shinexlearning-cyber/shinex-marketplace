const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { isValidUUID } = require('../utils/helpers');
const router = express.Router();

// Favorite a product
router.post('/product/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidUUID(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already favorited
    const { data: existing, error: existingError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', productId)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Product already in favorites'
      });
    }

    // Add to favorites
    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert([
        {
          user_id: req.user.id,
          product_id: productId
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Favorite product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to favorite product'
      });
    }

    res.json({
      success: true,
      message: 'Product added to favorites',
      data: favorite
    });
  } catch (error) {
    console.error('Favorite product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to favorite product'
    });
  }
});

// Remove favorite product
router.delete('/product/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidUUID(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', productId);

    if (error) {
      console.error('Remove favorite product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove from favorites'
      });
    }

    res.json({
      success: true,
      message: 'Product removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from favorites'
    });
  }
});

// Favorite a seller/shop
router.post('/seller/:sellerId', authMiddleware, async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!isValidUUID(sellerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seller ID'
      });
    }

    // Check if seller exists
    const { data: seller, error: sellerError } = await supabase
      .from('users')
      .select('id')
      .eq('id', sellerId)
      .single();

    if (sellerError || !seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Prevent self-favorite
    if (sellerId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot favorite your own shop'
      });
    }

    // Check if already favorited
    const { data: existing, error: existingError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('seller_id', sellerId)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Seller already in favorites'
      });
    }

    // Add to favorites
    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert([
        {
          user_id: req.user.id,
          seller_id: sellerId
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Favorite seller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to favorite seller'
      });
    }

    res.json({
      success: true,
      message: 'Seller added to favorites',
      data: favorite
    });
  } catch (error) {
    console.error('Favorite seller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to favorite seller'
    });
  }
});

// Remove favorite seller
router.delete('/seller/:sellerId', authMiddleware, async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!isValidUUID(sellerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seller ID'
      });
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('seller_id', sellerId);

    if (error) {
      console.error('Remove favorite seller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove from favorites'
      });
    }

    res.json({
      success: true,
      message: 'Seller removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite seller error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from favorites'
    });
  }
});

// Get favorite products
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: favorites, error, count } = await supabase
      .from('favorites')
      .select(`
        *,
        product:products(
          *,
          user:users(id, username, full_name, avatar_url, shop_name, whatsapp),
          category:categories(id, name, slug),
          images:product_images(*)
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .not('product_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get favorite products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch favorites'
      });
    }

    // Format favorites
    const formattedFavorites = (favorites || []).map(fav => ({
      ...fav,
      product: fav.product ? {
        ...fav.product,
        primary_image: fav.product.images?.find(img => img.is_primary)?.image_url || 
                       fav.product.images?.[0]?.image_url || null
      } : null
    }));

    res.json({
      success: true,
      data: formattedFavorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get favorite products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite products'
    });
  }
});

// Get favorite sellers/shops
router.get('/sellers', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: favorites, error, count } = await supabase
      .from('favorites')
      .select(`
        *,
        seller:users!seller_id(
          id, username, full_name, bio, location, whatsapp, avatar_url, shop_name, shop_description
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .not('seller_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get favorite sellers error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch favorite sellers'
      });
    }

    res.json({
      success: true,
      data: favorites || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get favorite sellers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite sellers'
    });
  }
});

// Check if product is favorited
router.get('/product/:productId/check', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidUUID(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const { data: favorite, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Check favorite error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check favorite status'
      });
    }

    res.json({
      success: true,
      data: {
        is_favorited: !!favorite
      }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite status'
    });
  }
});

// Check if seller is favorited
router.get('/seller/:sellerId/check', authMiddleware, async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!isValidUUID(sellerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seller ID'
      });
    }

    const { data: favorite, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('seller_id', sellerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Check favorite error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check favorite status'
      });
    }

    res.json({
      success: true,
      data: {
        is_favorited: !!favorite
      }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite status'
    });
  }
});

module.exports = router;
