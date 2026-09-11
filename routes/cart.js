const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { isValidUUID } = require('../utils/helpers');
const router = express.Router();

// Get current user's cart, with live product details joined in.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id, quantity, created_at,
        product:products(
          id, name, price, is_sold, is_active, user_id,
          images:product_images(image_url, is_primary),
          seller:users(id, username, shop_name, whatsapp)
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get cart error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch cart' });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

// Add a product to the cart (or bump quantity if it's already there).
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id || !isValidUUID(product_id)) {
      return res.status(400).json({ success: false, message: 'Valid product_id is required' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number' });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, user_id, is_sold, is_active')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    if (product.is_sold || !product.is_active) {
      return res.status(400).json({ success: false, message: 'This listing is no longer available' });
    }
    if (product.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: "You can't add your own listing to your cart" });
    }

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('cart_items')
        .insert([{ user_id: req.user.id, product_id, quantity }])
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    }

    res.status(201).json({ success: true, message: 'Added to cart', data: result });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
});

// Update quantity of one cart item (must belong to the requester).
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid cart item id' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number' });
    }

    const { data: item } = await supabase
      .from('cart_items')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!item || item.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Cart updated', data });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove one item from the cart.
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid cart item id' });
    }

    const { data: item } = await supabase
      .from('cart_items')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!item || item.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const { error } = await supabase.from('cart_items').delete().eq('id', id);
    if (error) throw error;

    res.json({ success: true, message: 'Removed from cart' });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove item' });
  }
});

// Clear the whole cart (used after checkout, or manually).
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

module.exports = router;
