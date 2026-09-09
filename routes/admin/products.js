const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { getPagination } = require('../../utils/helpers');
const { deleteImage } = require('../../services/cloudinary');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      seller, 
      page = 1, 
      limit = 20,
      status,
      min_price,
      max_price
    } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('products')
      .select(`
        *,
        user:users(id, username, full_name, email, phone),
        category:categories(id, name),
        images:product_images(*)
      `, { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (seller) {
      query = query.eq('user_id', seller);
    }

    if (min_price) {
      query = query.gte('price', parseFloat(min_price));
    }

    if (max_price) {
      query = query.lte('price', parseFloat(max_price));
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    } else if (status === 'sold') {
      query = query.eq('is_sold', true);
    }

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get admin products error:', error);
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
    console.error('Get admin products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Get single product (admin view)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        user:users(id, username, full_name, email, phone, bio, location, avatar_url),
        category:categories(id, name, slug),
        images:product_images(*)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get admin product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Delete product (admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get product images
    const { data: images } = await supabase
      .from('product_images')
      .select('image_public_id')
      .eq('product_id', id);

    // Delete images from Cloudinary
    if (images && images.length > 0) {
      await Promise.all(
        images.map(img => deleteImage(img.image_public_id))
      );
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Admin delete product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

module.exports = router;
