const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all durations (admin view)
router.get('/', async (req, res) => {
  try {
    const { data: durations, error } = await supabase
      .from('advertisement_durations')
      .select('*')
      .order('duration_days', { ascending: true });

    if (error) {
      console.error('Get durations error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch durations'
      });
    }

    res.json({
      success: true,
      data: durations
    });
  } catch (error) {
    console.error('Get durations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch durations'
    });
  }
});

// Create duration
router.post('/', async (req, res) => {
  try {
    const { duration_days, price, is_active } = req.body;

    if (!duration_days || !price) {
      return res.status(400).json({
        success: false,
        message: 'Duration days and price are required'
      });
    }

    if (duration_days < 1) {
      return res.status(400).json({
        success: false,
        message: 'Duration days must be at least 1'
      });
    }

    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than or equal to 0'
      });
    }

    // Check if duration already exists
    const { data: existing, error: checkError } = await supabase
      .from('advertisement_durations')
      .select('id')
      .eq('duration_days', duration_days)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Duration already exists'
      });
    }

    const { data: duration, error } = await supabase
      .from('advertisement_durations')
      .insert([
        {
          duration_days: parseInt(duration_days),
          price: parseFloat(price),
          is_active: is_active !== undefined ? is_active : true
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Create duration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create duration'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Duration created successfully',
      data: duration
    });
  } catch (error) {
    console.error('Create duration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create duration'
    });
  }
});

// Update duration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { duration_days, price, is_active } = req.body;

    const updates = {};
    if (duration_days !== undefined) {
      if (duration_days < 1) {
        return res.status(400).json({
          success: false,
          message: 'Duration days must be at least 1'
        });
      }
      updates.duration_days = parseInt(duration_days);
    }
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than or equal to 0'
        });
      }
      updates.price = parseFloat(price);
    }
    if (is_active !== undefined) {
      updates.is_active = is_active;
    }

    const { data: duration, error } = await supabase
      .from('advertisement_durations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !duration) {
      return res.status(404).json({
        success: false,
        message: 'Duration not found'
      });
    }

    res.json({
      success: true,
      message: 'Duration updated successfully',
      data: duration
    });
  } catch (error) {
    console.error('Update duration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update duration'
    });
  }
});

// Delete duration (only if not in use)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if duration is in use
    const { count, error: countError } = await supabase
      .from('advertisements')
      .select('*', { count: 'exact', head: true })
      .eq('duration_id', id);

    if (countError) {
      console.error('Check duration usage error:', countError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check duration usage'
      });
    }

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete duration that is in use by advertisements'
      });
    }

    const { error } = await supabase
      .from('advertisement_durations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete duration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete duration'
      });
    }

    res.json({
      success: true,
      message: 'Duration deleted successfully'
    });
  } catch (error) {
    console.error('Delete duration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete duration'
    });
  }
});

module.exports = router;
