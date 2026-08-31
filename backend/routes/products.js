const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all products (public)
router.get('/', async (req, res) => {
    try {
        const { category, search, limit = 20, offset = 0 } = req.query;

        let query = supabase
            .from('products')
            .select(`
                *,
                seller:users(id, username, full_name, avatar, location),
                category:categories(id, name)
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        // Filter by category
        if (category) {
            query = query.eq('category_id', category);
        }

        // Search by name or description
        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data: products, error } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }

        res.json({ products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: product, error } = await supabase
            .from('products')
            .select(`
                *,
                seller:users(id, username, full_name, avatar, location, whatsapp),
                category:categories(id, name)
            `)
            .eq('id', id)
            .single();

        if (error || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Increment view count
        await supabase
            .from('products')
            .update({ views: (product.views || 0) + 1 })
            .eq('id', id);

        res.json({ product });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create product (authenticated)
router.post('/', authMiddleware, [
    body('name').notEmpty().withMessage('Product name is required'),
    body('price').isNumeric().withMessage('Price must be a number'),
    body('category_id').notEmpty().withMessage('Category is required'),
    body('condition').isIn(['New', 'Used']).withMessage('Condition must be New or Used')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name,
            price,
            description,
            category_id,
            location,
            condition,
            images = []
        } = req.body;

        const { data: product, error } = await supabase
            .from('products')
            .insert([{
                name,
                price: parseFloat(price),
                description,
                category_id,
                location,
                condition,
                images,
                seller_id: req.user.id,
                status: 'active'
            }])
            .select(`
                *,
                seller:users(id, username, full_name, avatar)
            `)
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return res.status(500).json({ error: 'Failed to create product' });
        }

        res.status(201).json({ product });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update product (authenticated)
router.put('/:id', authMiddleware, [
    body('name').optional().notEmpty().withMessage('Product name cannot be empty'),
    body('price').optional().isNumeric().withMessage('Price must be a number'),
    body('condition').optional().isIn(['New', 'Used']).withMessage('Condition must be New or Used'),
    body('status').optional().isIn(['active', 'sold', 'inactive']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;

        // Check if product exists and belongs to user
        const { data: existing, error: fetchError } = await supabase
            .from('products')
            .select('seller_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (existing.seller_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own products' });
        }

        // Remove fields that shouldn't be updated
        delete updates.seller_id;
        delete updates.created_at;
        delete updates.views;

        // Parse price if present
        if (updates.price) {
            updates.price = parseFloat(updates.price);
        }

        const { data: product, error } = await supabase
            .from('products')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                seller:users(id, username, full_name, avatar)
            `)
            .single();

        if (error) {
            console.error('Error updating product:', error);
            return res.status(500).json({ error: 'Failed to update product' });
        }

        res.json({ product });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete product (authenticated)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if product exists and belongs to user
        const { data: existing, error: fetchError } = await supabase
            .from('products')
            .select('seller_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (existing.seller_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own products' });
        }

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            return res.status(500).json({ error: 'Failed to delete product' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get products by seller
router.get('/seller/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status = 'active' } = req.query;

        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                category:categories(id, name)
            `)
            .eq('seller_id', userId)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching seller products:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }

        res.json({ products });
    } catch (error) {
        console.error('Error fetching seller products:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;