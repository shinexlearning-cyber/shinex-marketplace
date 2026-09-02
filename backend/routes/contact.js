import express from 'express';
import { supabase } from '../supabase/client.js';

const router = express.Router();

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const { error } = await supabase
      .from('contact_messages')
      .insert({ name, email, message });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
