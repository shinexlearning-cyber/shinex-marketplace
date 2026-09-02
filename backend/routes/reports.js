import express from 'express';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Create report
router.post('/', verifyToken, async (req, res) => {
  try {
    const { productId, reason } = req.body;

    if (!productId || !reason) {
      return res.status(400).json({ error: 'Product ID and reason are required' });
    }

    // Check if product exists
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        product_id: productId,
        reporter_id: req.userId,
        reason,
        status: 'pending',
      });

    if (error) throw error;

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
