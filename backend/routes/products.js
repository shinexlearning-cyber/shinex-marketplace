const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const { uploadImage, deleteImage, deleteImages } = require('../services/cloudinary');
const { getPagination, buildPaginationResponse, isValidUUID } = require('../utils/helpers');
const router = express.Router();

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

    // Create product
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
          location: location || ''
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
      message: 'Product created successfully',
      data: {
        product: {
          ...product,
          images
        }
      }
    });
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
      query = query.eq('is_active', true).eq('is_sold', false);
    } else if (status === 'all') {
      query = query.eq('is_active', true);
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

// Get single product
router.get('/:id', async (req, res) => {
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

module.exports = router;
