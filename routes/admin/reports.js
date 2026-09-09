const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { getPagination } = require('../../utils/helpers');
const { logActivity } = require('../../utils/activity');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all reports with filters
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('reports')
      .select(`
        *,
        reporter:users!reporter_id(id, username, full_name, email),
        target_user:users!target_user_id(id, username, full_name),
        target_product:products!target_product_id(id, name, price),
        target_advertisement:advertisements!target_advertisement_id(id, title),
        resolved_by_user:users!resolved_by(id, username, full_name)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    // Filter by type
    if (type === 'user') {
      query = query.not('target_user_id', 'is', null);
    } else if (type === 'product') {
      query = query.not('target_product_id', 'is', null);
    } else if (type === 'advertisement') {
      query = query.not('target_advertisement_id', 'is', null);
    }

    const { data: reports, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get reports error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reports'
      });
    }

    res.json({
      success: true,
      data: reports || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

// Get single report
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: report, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:users!reporter_id(id, username, full_name, email, phone),
        target_user:users!target_user_id(id, username, full_name, email),
        target_product:products!target_product_id(id, name, description, price, user_id),
        target_advertisement:advertisements!target_advertisement_id(id, title, description, user_id),
        resolved_by_user:users!resolved_by(id, username, full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report'
    });
  }
});

// Resolve report
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const { data: report, error } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        admin_notes: admin_notes || 'Resolved by admin',
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: report
    });

    logActivity(report.reporter_id, 'report_resolved', 'Your report was reviewed and resolved', { report_id: report.id });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve report'
    });
  }
});

// Dismiss report
router.patch('/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const { data: report, error } = await supabase
      .from('reports')
      .update({
        status: 'dismissed',
        admin_notes: admin_notes || 'Dismissed by admin',
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report dismissed',
      data: report
    });

    logActivity(report.reporter_id, 'report_dismissed', 'Your report was reviewed and dismissed', { report_id: report.id });
  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss report'
    });
  }
});

module.exports = router;
