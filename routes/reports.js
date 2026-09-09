const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { isValidUUID } = require('../utils/helpers');
const router = express.Router();

// Create report
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      target_user_id, 
      target_product_id, 
      target_advertisement_id,
      reason, 
      description 
    } = req.body;

    // Validate one target
    const targets = [target_user_id, target_product_id, target_advertisement_id].filter(Boolean);
    if (targets.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Please specify exactly one target: user, product, or advertisement'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }

    // Validate target exists
    let targetExists = false;
    if (target_user_id) {
      if (!isValidUUID(target_user_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', target_user_id)
        .single();
      targetExists = !!data && !error;
    } else if (target_product_id) {
      if (!isValidUUID(target_product_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID'
        });
      }
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('id', target_product_id)
        .single();
      targetExists = !!data && !error;
    } else if (target_advertisement_id) {
      if (!isValidUUID(target_advertisement_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid advertisement ID'
        });
      }
      const { data, error } = await supabase
        .from('advertisements')
        .select('id')
        .eq('id', target_advertisement_id)
        .single();
      targetExists = !!data && !error;
    }

    if (!targetExists) {
      return res.status(404).json({
        success: false,
        message: 'Target not found'
      });
    }

    // Check for duplicate report (same reporter, same target within 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    let query = supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', req.user.id)
      .gte('created_at', oneDayAgo.toISOString());

    if (target_user_id) {
      query = query.eq('target_user_id', target_user_id);
    } else if (target_product_id) {
      query = query.eq('target_product_id', target_product_id);
    } else if (target_advertisement_id) {
      query = query.eq('target_advertisement_id', target_advertisement_id);
    }

    const { data: existingReport, error: existingError } = await query.single();

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: 'You have already reported this item recently. Please wait before reporting again.'
      });
    }

    // Create report
    const reportData = {
      reporter_id: req.user.id,
      reason,
      description: description || '',
      status: 'pending'
    };

    if (target_user_id) reportData.target_user_id = target_user_id;
    if (target_product_id) reportData.target_product_id = target_product_id;
    if (target_advertisement_id) reportData.target_advertisement_id = target_advertisement_id;

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert([reportData])
      .select('*')
      .single();

    if (reportError) {
      console.error('Create report error:', reportError);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit report'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our team will review it.',
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit report'
    });
  }
});

// Get user's reports
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: reports, error, count } = await supabase
      .from('reports')
      .select(`
        *,
        target_user:users!target_user_id(id, username, full_name),
        target_product:products!target_product_id(id, name),
        target_advertisement:advertisements!target_advertisement_id(id, title)
      `, { count: 'exact' })
      .eq('reporter_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get user reports error:', error);
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
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

module.exports = router;
