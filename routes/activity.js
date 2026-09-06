const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { getPagination, buildPaginationResponse } = require('../utils/helpers');
const router = express.Router();

// Get the current user's activity feed. Only real, database-backed
// events are ever returned here — nothing is synthesized.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    const { data, error, count } = await supabase
      .from('activity')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get activity error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch activity'
      });
    }

    res.json({
      success: true,
      ...buildPaginationResponse(data || [], count || 0, page, pageLimit)
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity'
    });
  }
});

module.exports = router;
