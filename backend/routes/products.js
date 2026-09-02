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
    folder: 'shinex-products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get products (public)
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('products')
      .select('*, seller:users(full_name, username, avatar)', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const products = data.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      description: p.description,
      location: p.location,
      images: p.images || [],
      image: p.images?.[0] || null,
      seller: p.seller,
      sellerName: p.seller?.full_name || p.seller?.username,
      createdAt: p.created_at,
    }));

    res.json({ products, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Get single product (public)
router.get('/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, seller:users(full_name, username, avatar, whatsapp, shop_name)')
      .eq('id', req.params.id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      location: product.location,
      images: product.images || [],
      seller: product.seller,
      whatsapp: product.seller?.whatsapp,
      createdAt: product.created_at,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// Create product (authenticated)
router.post('/', verifyToken, upload.array('images', 5), async (req, res) => {
  try {
    const { name, price, category, description, location } = req.body;

    if (!name || !price || !description) {
      return res.status(400).json({ error: 'Name, price, and description are required' });
    }

    const imageUrls = req.files.map(f => f.path);

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        price: parseFloat(price),
        category: category || null,
        description,
        location: location || null,
        images: imageUrls,
        seller_id: req.userId,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw error;

    res.status(201).json({ 
      success: true,
      product: { id: product.id }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;
