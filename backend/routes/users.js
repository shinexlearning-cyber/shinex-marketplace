import express from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get user stats
router.get('/me/stats', verifyToken, async (req, res) => {
  try {
    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', req.userId)
      .eq('status', 'active');

    const { count: favoritesCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);

    // Track views would need a separate table

    res.json({
      productsCount: productsCount || 0,
      favoritesCount: favoritesCount || 0,
      viewsCount: 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Update user profile
router.patch('/me', verifyToken, async (req, res) => {
  try {
    const { fullName, bio, location, whatsapp, shopName } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (shopName !== undefined) updates.shop_name = shopName;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select('id, full_name, username, email, phone, role, avatar, bio, location, whatsapp, shop_name')
      .single();

    if (error) throw error;

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
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get shop by username (public)
router.get('/shop/:username', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, username, avatar, bio, location, whatsapp, shop_name')
      .eq('username', req.params.username)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (productsError) throw productsError;

    res.json({
      shop: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        shopName: user.shop_name,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        whatsapp: user.whatsapp,
      },
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images || [],
        image: p.images?.[0] || null,
        location: p.location,
        seller: {
          fullName: user.full_name,
          username: user.username,
          avatar: user.avatar,
        },
      })),
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ error: 'Failed to load shop' });
  }
});

export default router;
