const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { getPagination } = require('../../utils/helpers');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all payments
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      search,
      start_date,
      end_date,
      page = 1, 
      limit = 20 
    } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('advertisement_payments')
      .select(`
        *,
        user:users(id, username, full_name, email),
        advertisement:advertisements(id, title, duration_days, amount)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`paystack_reference.ilike.%${search}%,user.username.ilike.%${search}%,user.email.ilike.%${search}%`);
    }

    if (start_date) {
      query = query.gte('created_at', new Date(start_date).toISOString());
    }

    if (end_date) {
      query = query.lte('created_at', new Date(end_date).toISOString());
    }

    const { data: payments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get payments error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments'
      });
    }

    res.json({
      success: true,
      data: payments || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// Get payment summary/stats
router.get('/stats', async (req, res) => {
  try {
    // Total revenue
    const { data: totalRevenue, error: revenueError } = await supabase
      .from('advertisement_payments')
      .select('amount')
      .eq('status', 'success');

    if (revenueError) {
      console.error('Revenue stats error:', revenueError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment stats'
      });
    }

    // Count by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('advertisement_payments')
      .select('status', { count: 'exact' })
      .group('status');

    // Count by month (last 12 months)
    const { data: monthlyCounts, error: monthlyError } = await supabase
      .from('advertisement_payments')
      .select('created_at')
      .eq('status', 'success')
      .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString());

    if (monthlyError) {
      console.error('Monthly stats error:', monthlyError);
    }

    const totalAmount = totalRevenue?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0;

    const stats = {
      total_revenue: totalAmount,
      total_transactions: totalRevenue?.length || 0,
      status_breakdown: statusCounts || [],
      monthly_data: monthlyCounts || []
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment stats'
    });
  }
});

// Get single payment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabase
      .from('advertisement_payments')
      .select(`
        *,
        user:users(id, username, full_name, email, phone),
        advertisement:advertisements(
          id, title, description, duration_days, amount,
          duration:advertisement_durations(duration_days, price)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
});

module.exports = router;
