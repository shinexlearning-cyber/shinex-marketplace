const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const { uploadImage, deleteImage, deleteImages } = require('../services/cloudinary');
const { getPagination, buildPaginationResponse, isValidUUID, getListingLimit, getEffectivePlan } = require('../utils/helpers');
const { logActivity } = require('../utils/activity');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Best-effort auth: attaches req.user if a valid token is present, but
// never blocks the request if it isn't. Used on public read routes that
// need to know "is this the owner/an admin looking at their own pending
// listing" without requiring login for everyone else.
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user } = await supabase
      .from('users')
      .select('id, is_admin, is_suspended')
      .eq('id', decoded.id)
      .single();
    if (user && !user.is_suspended) req.user = user;
  } catch (e) {
    // Invalid/expired token on a public route — just proceed unauthenticated.
  }
  next();
};

// Create product
router.post('/', authMiddleware, uploadMultiple, async (req, res) => {
  try {
    const { name, description, price, category_id, condition, location } = req.body;

    // Validate required fields
    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required'
      });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid number greater than or equal to 0'
      });
    }

    // Validate category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .single();

    if (categoryError || !category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category selected'
      });
    }

    // Enforce the seller's ACTIVE listing limit server-side (Part 10/18).
    // Only pending+approved, non-deleted listings count toward the cap —
    // rejected/deleted listings never do.
    const limit = getListingLimit(req.user);
    if (limit !== null) {
      const { count: activeCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .in('approval_status', ['pending', 'approved']);

      if (countError) {
        console.error('Listing limit check error:', countError);
      } else if ((activeCount || 0) >= limit) {
        return res.status(403).json({
          success: false,
          code: 'LISTING_LIMIT_REACHED',
          message: `You've reached your ${limit}-listing limit. Delete one of your active listings or subscribe to a SHINEX plan to list more.`
        });
      }
    }

    // Create product — always starts pending admin review (Part 2/17).
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([
        {
          user_id: req.user.id,
          name,
          description: description || '',
          price: parseFloat(price),
          category_id,
          condition: condition || 'new',
          location: location || '',
          approval_status: 'pending'
        }
      ])
      .select('*')
      .single();

    if (productError) {
      console.error('Create product error:', productError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create product'
      });
    }

    // Upload images if provided
    let images = [];
    if (req.files && req.files.length > 0) {
      try {
        // Upload images to Cloudinary
        const uploadPromises = req.files.map((file, index) => 
          uploadImage(file.buffer, 'shinex_products')
        );
        const uploadResults = await Promise.all(uploadPromises);

        // Save image records
        const imageRecords = uploadResults.map((result, index) => ({
          product_id: product.id,
          image_url: result.url,
          image_public_id: result.publicId,
          is_primary: index === 0,
          display_order: index
        }));

        const { data: imageData, error: imageError } = await supabase
          .from('product_images')
          .insert(imageRecords)
          .select('*');

        if (imageError) {
          console.error('Save images error:', imageError);
          // Clean up uploaded images if save fails
          await Promise.all(
            uploadResults.map(result => deleteImage(result.publicId))
          );
          return res.status(500).json({
            success: false,
            message: 'Failed to save product images'
          });
        }

        images = imageData || [];
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Delete product if image upload fails
        await supabase.from('products').delete().eq('id', product.id);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload images'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Your listing was submitted and is pending admin review.',
      data: {
        product: {
          ...product,
          images
        }
      }
    });

    logActivity(req.user.id, 'product_listed', `Your product "${product.name}" was submitted for review`, { product_id: product.id });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
});

// Get products with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      seller, 
      page = 1, 
      limit = 20, 
      min_price, 
      max_price,
      sort = 'newest',
      status = 'active'
    } = req.query;
    
    const { offset, limit: pageLimit } = getPagination(page, limit);

    // Part 1: real backend search across product title, description,
    // location AND the seller's shop/username, case-insensitive, partial
    // word match. PostgREST's .or() only covers the products table's own
    // columns, so seller/shop-name matches are resolved with a small
    // lookup query first and merged in with an OR on user_id.
    let matchingSellerIds = [];
    const term = (search || '').trim();
    if (term) {
      const { data: matchingSellers } = await supabase
        .from('users')
        .select('id')
        .or(`shop_name.ilike.%${term}%,username.ilike.%${term}%,full_name.ilike.%${term}%`);
      matchingSellerIds = (matchingSellers || []).map((u) => u.id);
    }

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        user:users(id, username, full_name, avatar_url, shop_name, whatsapp, location),
        category:categories(id, name, slug),
        images:product_images(*)
      `, { count: 'exact' });

    // Apply filters
    if (term) {
      const orParts = [
        `name.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `location.ilike.%${term}%`
      ];
      if (matchingSellerIds.length > 0) {
        orParts.push(`user_id.in.(${matchingSellerIds.join(',')})`);
      }
      query = query.or(orParts.join(','));
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

    // Public marketplace: only approved, active products (Part 17).
    if (status === 'active') {
      query = query.eq('is_active', true).eq('is_sold', false).eq('approval_status', 'approved');
    } else if (status === 'all') {
      query = query.eq('is_active', true).eq('approval_status', 'approved');
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'price_low':
        query = query.order('price', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + pageLimit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Get products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products'
      });
    }

    // Format products with primary image and user info
    const formattedProducts = (products || []).map(product => ({
      ...product,
      primary_image: product.images?.find(img => img.is_primary)?.image_url || 
                     product.images?.[0]?.image_url || null,
      seller: product.user ? {
        id: product.user.id,
        username: product.user.username,
        full_name: product.user.full_name,
        avatar_url: product.user.avatar_url,
        shop_name: product.user.shop_name,
        whatsapp: product.user.whatsapp,
        location: product.user.location
      } : null
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
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

 // Get categories
router.get('/categories/all', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Get categories error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get the logged-in user's OWN listings, every status included
// (Part 3/6: "My Shop" management view). Ownership is derived from the
// authenticated token — never from a client-supplied user_id.
router.get('/mine/all', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        images:product_images(*)
      `, { count: 'exact' })
      .eq('user_id', req.user.id);

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('approval_status', status);
    }

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get my products error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch your listings' });
    }

    const formatted = (products || []).map((p) => ({
      ...p,
      primary_image: p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url || null
    }));

    res.json({
      success: true,
      data: formatted,
      plan: {
        name: getEffectivePlan(req.user),
        active_listing_limit: getListingLimit(req.user)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your listings' });
  }
});

// Get single product
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        user:users(id, username, full_name, email, phone, bio, location, whatsapp, avatar_url, shop_name, shop_description),
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

    // Part 17: a pending/rejected listing is only visible to its owner
    // or an admin — never to the public.
    const isOwnerOrAdmin = req.user && (req.user.id === product.user_id || req.user.is_admin);
    if (product.approval_status !== 'approved' && !isOwnerOrAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    await supabase
      .from('products')
      .update({ views_count: (product.views_count || 0) + 1 })
      .eq('id', id);

    // Format product
    const formattedProduct = {
      ...product,
      primary_image: product.images?.find(img => img.is_primary)?.image_url || 
                     product.images?.[0]?.image_url || null,
      seller: product.user ? {
        id: product.user.id,
        username: product.user.username,
        full_name: product.user.full_name,
        email: product.user.email,
        phone: product.user.phone,
        bio: product.user.bio,
        location: product.user.location,
        whatsapp: product.user.whatsapp,
        avatar_url: product.user.avatar_url,
        shop_name: product.user.shop_name,
        shop_description: product.user.shop_description
      } : null
    };

    res.json({
      success: true,
      data: formattedProduct
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Update product
router.put('/:id', authMiddleware, uploadMultiple, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, condition, location } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Check product exists and ownership
    const { data: existingProduct, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (productError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (existingProduct.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this product'
      });
    }

    // Validate category if provided
    if (category_id) {
      const { data: category, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', category_id)
        .single();

      if (catError || !category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
    }

    // Build updates
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price) updates.price = parseFloat(price);
    if (category_id) updates.category_id = category_id;
    if (condition) updates.condition = condition;
    if (location !== undefined) updates.location = location;

    // Part 4: editing a listing that a non-admin owns does not bypass
    // admin approval — an approved listing goes back to pending review
    // whenever its content changes. Admins editing (e.g. moderation)
    // keep whatever status they set explicitly.
    if (!req.user.is_admin && existingProduct.approval_status === 'approved') {
      updates.approval_status = 'pending';
      updates.rejection_reason = null;
    }

    // Update product
    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Update product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product'
      });
    }

    // Handle new images if uploaded
    let images = [];
    if (req.files && req.files.length > 0) {
      try {
        // Delete old images
        const { data: oldImages } = await supabase
          .from('product_images')
          .select('image_public_id')
          .eq('product_id', id);

        if (oldImages && oldImages.length > 0) {
          await Promise.all(
            oldImages.map(img => deleteImage(img.image_public_id))
          );
          await supabase
            .from('product_images')
            .delete()
            .eq('product_id', id);
        }

        // Upload new images
        const uploadPromises = req.files.map((file, index) => 
          uploadImage(file.buffer, 'shinex_products')
        );
        const uploadResults = await Promise.all(uploadPromises);

        const imageRecords = uploadResults.map((result, index) => ({
          product_id: id,
          image_url: result.url,
          image_public_id: result.publicId,
          is_primary: index === 0,
          display_order: index
        }));

        const { data: imageData } = await supabase
          .from('product_images')
          .insert(imageRecords)
          .select('*');

        images = imageData || [];
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload new images'
        });
      }
    } else {
      // Get existing images
      const { data: existingImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id);
      images = existingImages || [];
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: {
          ...product,
          images
        }
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// Delete product
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Check product exists and ownership
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('user_id')
      .eq('id', id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this product'
      });
    }

    // Get and delete images from Cloudinary
    const { data: images } = await supabase
      .from('product_images')
      .select('image_public_id')
      .eq('product_id', id);

    if (images && images.length > 0) {
      await Promise.all(
        images.map(img => deleteImage(img.image_public_id))
      );
    }

    // Delete product (cascade will delete images in database)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete product error:', error);
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
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

// Mark product as sold
router.patch('/:id/sold', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_sold } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    // Check product exists and ownership
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('user_id')
      .eq('id', id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

   
    // Check ownership
    if (product.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this product'
      });
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update({ is_sold: is_sold === true })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Update sold status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product status'
      });
    }

    res.json({
      success: true,
      message: `Product marked as ${is_sold ? 'sold' : 'available'}`,
      data: updated
    });
  } catch (error) {
    console.error('Update sold status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product status'
    });
  }
});


module.exports = router;
