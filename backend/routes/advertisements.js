import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shinex-ads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1200, height: 600, crop: 'limit' }],
  },
});

const upload = multer({ storage });

const AD_PLANS = {
  '1day': { price: 200, days: 1 },
  '3days': { price: 500, days: 3 },
  '7days': { price: 1000, days: 7 },
  '30days': { price: 3000, days: 30 },
};

// Get active ads (public)
router.get('/active', async (req, res) => {
  try {
    const { data: ads, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ advertisements: ads || [] });
  } catch (error) {
    console.error('Get ads error:', error);
    res.json({ advertisements: [] });
  }
});

// Create advertisement
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { plan, title, description } = req.body;

    if (!plan || !title || !description) {
      return res.status(400).json({ error: 'Plan, title, and description are required' });
    }

    const planData = AD_PLANS[plan];
    if (!planData) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const imageUrl = req.file?.path || null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planData.days);

    const { data: ad, error } = await supabase
      .from('advertisements')
      .insert({
        user_id: req.userId,
        title,
        description,
        image: imageUrl,
        plan,
        price: planData.price,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // In production, create Paystack payment here
    // For now, just return success

    res.status(201).json({ 
      success: true,
      advertisement: ad,
      // paymentUrl: 'https://paystack.com/pay/...' // Would be generated
    });
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({ error: 'Failed to create advertisement' });
  }
});

export default router;
