const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');

// Get user favorites
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data: favorites, error } = await supabase
            .from('favorites')
            .select(`
                *,
                product:products(
                    *,
                    seller:users(id, username, full_name, avatar),
                    category:categories(id, name)
                ),
                seller:users!seller_id(id, username, full_name, avatar, bio, location)
            `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching favorites:', error);
            return res.status(500).json({ error: 'Failed to fetch favorites' });
        }

        // Separate product favorites and seller favorites
        const productFavorites = favorites
            .filter(f => f.product_id !== null && f.product)
            .map(f => f.product);

        const sellerFavorites = favorites
            .filter(f => f.seller_id !== null && f.seller)
            .map(f => f.seller);

        res.json({
            products: productFavorites,
            sellers: sellerFavorites
        });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle favorite product
router.post('/product/:productId', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.params;

        // Check if product exists
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if already favorited
        const { data: existing, error: checkError } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('product_id', productId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking favorite:', checkError);
            return res.status(500).json({ error: 'Failed to check favorite status' });
        }

        if (existing) {
            // Remove favorite
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('id', existing.id);

            if (error) {
                console.error('Error removing favorite:', error);
                return res.status(500).json({ error: 'Failed to remove favorite' });
            }

            return res.json({ message: 'Favorite removed', favorited: false });
        } else {
            // Add favorite
            const { error } = await supabase
                .from('favorites')
                .insert([{
                    user_id: req.user.id,
                    product_id: productId,
                    seller_id: null
                }]);

            if (error) {
                console.error('Error adding favorite:', error);
                return res.status(500).json({ error: 'Failed to add favorite' });
            }

            return res.json({ message: 'Favorite added', favorited: true });
        }
    } catch (error) {
        console.error('Error toggling product favorite:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle favorite seller
router.post('/seller/:sellerId', authMiddleware, async (req, res) => {
    try {
        const { sellerId } = req.params;

        // Can't favorite yourself
        if (sellerId === req.user.id) {
            return res.status(400).json({ error: 'You cannot favorite yourself' });
        }

        // Check if seller exists
        const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('id')
            .eq('id', sellerId)
            .single();

        if (sellerError || !seller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        // Check if already favorited
        const { data: existing, error: checkError } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('seller_id', sellerId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking favorite:', checkError);
            return res.status(500).json({ error: 'Failed to check favorite status' });
        }

        if (existing) {
            // Remove favorite
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('id', existing.id);

            if (error) {
                console.error('Error removing favorite:', error);
                return res.status(500).json({ error: 'Failed to remove favorite' });
            }

            return res.json({ message: 'Favorite removed', favorited: false });
        } else {
            // Add favorite
            const { error } = await supabase
                .from('favorites')
                .insert([{
                    user_id: req.user.id,
                    product_id: null,
                    seller_id: sellerId
                }]);

            if (error) {
                console.error('Error adding favorite:', error);
                return res.status(500).json({ error: 'Failed to add favorite' });
            }

            return res.json({ message: 'Favorite added', favorited: true });
        }
    } catch (error) {
        console.error('Error toggling seller favorite:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check if product is favorited
router.get('/check/product/:productId', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.params;

        const { data: favorite, error } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('product_id', productId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking favorite:', error);
            return res.status(500).json({ error: 'Failed to check favorite status' });
        }

        res.json({ favorited: !!favorite });
    } catch (error) {
        console.error('Error checking favorite:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check if seller is favorited
router.get('/check/seller/:sellerId', authMiddleware, async (req, res) => {
    try {
        const { sellerId } = req.params;

        const { data: favorite, error } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('seller_id', sellerId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking favorite:', error);
            return res.status(500).json({ error: 'Failed to check favorite status' });
        }

        res.json({ favorited: !!favorite });
    } catch (error) {
        console.error('Error checking favorite:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;