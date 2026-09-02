import express from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/admin.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken, isAdmin);

// Get admin stats
router.get('/stats', async (req, res) => {
  try {
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: productsCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { count: activeAdsCount } = await supabase
      .from('advertisements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: pendingReportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    res.json({
      usersCount: usersCount || 0,
      productsCount: productsCount || 0,
      activeAdsCount: activeAdsCount || 0,
      pendingReportsCount: pendingReportsCount || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Generic table GET
router.get('/:resource', async (req, res) => {
  try {
    const { resource } = req.params;
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const validResources = ['users', 'products', 'advertisements', 'payments', 'reports', 'contact'];
    if (!validResources.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }

    let query = supabase
      .from(resource)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      // Search in appropriate columns based on resource
      const searchColumns = {
        users: ['full_name', 'username', 'email'],
        products: ['name', 'category'],
        advertisements: ['title'],
        payments: ['reference'],
        reports: ['reason'],
        contact: ['name', 'email', 'message'],
      };

      const columns = searchColumns[resource] || [];
      if (columns.length > 0) {
        const orConditions = columns.map(col => `${col}.ilike.%${search}%`).join(',');
        query = query.or(orConditions);
      }
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      items: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get admin resource error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// Delete from resource
router.delete('/:resource/:id', async (req, res) => {
  try {
    const { resource, id } = req.params;

    const validResources = ['users', 'products', 'advertisements', 'payments', 'reports', 'contact'];
    if (!validResources.includes(resource)) {
      return res.status(400).json({ error: 'Invalid resource' });
    }

    const { error
