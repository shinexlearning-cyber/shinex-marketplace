const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { getPagination, addDays } = require('../../utils/helpers');
const { deleteImage } = require('../../services/cloudinary');
const { logActivity } = require('../../utils/activity');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all advertisements with filters
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      approval, 
      payment, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('advertisements')
      .select(`
        *,
        user:users!advertisements_user_id_fkey(id, username, full_name, email),
        duration:advertisement_durations(duration_days, price)
      `, { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (payment) {
      query = query.eq('payment_status', payment);
    }

    if (approval) {
      query = query.eq('approval_status', approval);
    }

    if (status === 'active') {
      query = query.eq('approval_status', 'approved')
        .eq('payment_status', 'paid')
        .gte('expires_at', new Date().toISOString());
    } else if (status === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    }

    const { data: advertisements, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get admin ads error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch advertisements'
      });
    }

    res.json({
      success: true,
      data: advertisements || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get admin ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
});

// Get single advertisement
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: advertisement, error } = await supabase
      .from('advertisements')
      .select(`
        *,
        user:users!advertisements_user_id_fkey(id, username, full_name, email, phone),
        duration:advertisement_durations(id, duration_days, price),
        payment:advertisement_payments(*)
      `)
      .eq('id', id)
      .single();

    if (error || !advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    console.error('Get admin ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisement'
    });
  }
});

// Approve advertisement
router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ad exists and is paid
    const { data: ad, error: adError } = await supabase
      .from('advertisements')
      .select('*')
      .eq('id', id)
      .single();

    if (adError || !ad) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    if (ad.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve unpaid advertisement'
      });
    }

    if (ad.approval_status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Advertisement is already approved'
      });
    }

    // Set start and expiry dates if not set
    const startDate = ad.starts_at ? new Date(ad.starts_at) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + ad.duration_days);

    const { data: advertisement, error } = await supabase
      .from('advertisements')
      .update({
        approval_status: 'approved',
        starts_at: startDate.toISOString(),
        expires_at: endDate.toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Approve ad error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to approve advertisement'
      });
    }

    res.json({
      success: true,
      message: 'Advertisement approved successfully',
      data: advertisement
    });

    logActivity(advertisement.user_id, 'advertisement_approved', `Your advertisement "${advertisement.title}" is now live`, { advertisement_id: advertisement.id });
  } catch (error) {
    console.error('Approve ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve advertisement'
    });
  }
});

// Reject advertisement
router.patch('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: advertisement, error } = await supabase
      .from('advertisements')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason || 'No reason provided'
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.json({
      success: true,
      message: 'Advertisement rejected',
      data: advertisement
    });

    logActivity(advertisement.user_id, 'advertisement_rejected', `Your advertisement "${advertisement.title}" was rejected`, { advertisement_id: advertisement.id, reason: advertisement.rejection_reason });
  } catch (error) {
    console.error('Reject ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject advertisement'
    });
  }
});

// Pause advertisement
router.patch('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: advertisement, error } = await supabase
      .from('advertisements')
      .update({
        approval_status: 'paused'
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.json({
      success: true,
      message: 'Advertisement paused',
      data: advertisement
    });

    logActivity(advertisement.user_id, 'advertisement_paused', `Your advertisement "${advertisement.title}" was paused`, { advertisement_id: advertisement.id });
  } catch (error) {
    console.error('Pause ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause advertisement'
    });
  }
});

// Delete advertisement (admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get ad to delete image
    const { data: ad, error: adError } = await supabase
      .from('advertisements')
      .select('image_public_id')
      .eq('id', id)
      .single();

    if (adError && adError.code !== 'PGRST116') {
      console.error('Get ad error:', adError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete advertisement'
      });
    }

    // Delete image from Cloudinary
    if (ad?.image_public_id) {
      await deleteImage(ad.image_public_id);
    }

    // Delete advertisement
    const { error } = await supabase
      .from('advertisements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete ad error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete advertisement'
      });
    }

    res.json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete advertisement'
    });
  }
});

module.exports = router;
