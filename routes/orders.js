const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { isValidUUID, getPagination, buildPaginationResponse } = require('../utils/helpers');
const { logActivity } = require('../utils/activity');
const router = express.Router();

// Checkout: turn the current cart into one order PER SELLER (a cart can
// span multiple sellers' listings, and each seller needs their own
// order + their own WhatsApp handoff). This does NOT charge a card —
// see database/migrations/003_cart_orders.sql for why: there is no
// Paystack Subaccount/payout path to individual sellers configured.
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { delivery_address, notes } = req.body;

    if (!delivery_address || !delivery_address.trim()) {
      return res.status(400).json({ success: false, message: 'Delivery address is required' });
    }

    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        id, quantity,
        product:products(id, name, price, user_id, is_sold, is_active)
      `)
      .eq('user_id', req.user.id);

    if (cartError) {
      console.error('Checkout fetch cart error:', cartError);
      return res.status(500).json({ success: false, message: 'Failed to load your cart' });
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    const unavailable = cartItems.filter((i) => !i.product || i.product.is_sold || !i.product.is_active);
    if (unavailable.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'One or more items in your cart are no longer available. Please remove them and try again.'
      });
    }

    // Group by seller
    const bySeller = {};
    for (const item of cartItems) {
      const sellerId = item.product.user_id;
      if (!bySeller[sellerId]) bySeller[sellerId] = [];
      bySeller[sellerId].push(item);
    }

    const createdOrders = [];

    for (const sellerId of Object.keys(bySeller)) {
      const items = bySeller[sellerId];
      const subtotal = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          buyer_id: req.user.id,
          seller_id: sellerId,
          status: 'pending',
          delivery_address: delivery_address.trim(),
          notes: notes || null,
          subtotal
        }])
        .select('*')
        .single();

      if (orderError) {
        console.error('Create order error:', orderError);
        return res.status(500).json({ success: false, message: 'Failed to create order' });
      }

      const orderItemRows = items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        price: i.product.price,
        quantity: i.quantity
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemRows);
      if (itemsError) {
        console.error('Create order items error:', itemsError);
        return res.status(500).json({ success: false, message: 'Failed to save order items' });
      }

      createdOrders.push({ ...order, items: orderItemRows });

      logActivity(req.user.id, 'order_placed', `Order placed with ${items.length} item(s)`, { order_id: order.id });
      logActivity(sellerId, 'order_received', 'You received a new order', { order_id: order.id });
    }

    // Cart is cleared only after every order was created successfully.
    await supabase.from('cart_items').delete().eq('user_id', req.user.id);

    res.status(201).json({ success: true, message: 'Order placed', data: { orders: createdOrders } });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: 'Checkout failed' });
  }
});

// Orders the current user placed as a buyer.
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    const { data, error, count } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        seller:users!orders_seller_id_fkey(id, username, shop_name, whatsapp)
      `, { count: 'exact' })
      .eq('buyer_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get my orders error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }

    res.json({ success: true, ...buildPaginationResponse(data || [], count || 0, page, pageLimit) });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Orders the current user received as a seller.
router.get('/received', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    const { data, error, count } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        buyer:users!orders_buyer_id_fkey(id, username, full_name, whatsapp, phone)
      `, { count: 'exact' })
      .eq('seller_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get received orders error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }

    res.json({ success: true, ...buildPaginationResponse(data || [], count || 0, page, pageLimit) });
  } catch (error) {
    console.error('Get received orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Only the seller on the order can move it forward (confirmed/completed);
// either party can cancel. Ownership is always checked server-side.
const ALLOWED_STATUSES = ['confirmed', 'completed', 'cancelled'];

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isSeller = order.seller_id === req.user.id;
    const isBuyer = order.buyer_id === req.user.id;
    if (!isSeller && !isBuyer) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }
    if (status !== 'cancelled' && !isSeller) {
      return res.status(403).json({ success: false, message: 'Only the seller can update this order to that status' });
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, message: 'Order updated', data: updated });

    const notifyUserId = isSeller ? order.buyer_id : order.seller_id;
    logActivity(notifyUserId, 'order_status_changed', `Your order is now "${status}"`, { order_id: id, status });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

module.exports = router;
