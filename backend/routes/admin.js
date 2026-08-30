const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { body, validationResult } = require('express-validator');

// All admin routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// ==================== DASHBOARD STATS ====================
router.get('/stats', async (req, res) => {
    try {
        const [users, products, ads, reports, payments] = await Promise.all([
            supabase.from('users').select('count'),
            supabase.from('products').select('count'),
            supabase.from('advertisements').select('count'),
            supabase.from('reports').select('count').eq('status', 'pending'),
            supabase.from('advertisement_payments').select('count').eq('status', 'success')
        ]);

        res.json({
            total_users: users.count || 0,
            total_products: products.count || 0,
            total_advertisements: ads.count || 0,
            pending_reports: reports.count || 0,
            total_payments: payments.count || 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ==================== USER MANAGEMENT ====================
router.get('/users', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const { data: users, error, count } = await supabase
            .from('users')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({ error: 'Failed to fetch users' });
        }

        // Remove password hashes
        const sanitizedUsers = users.map(user => {
            delete user.password_hash;
            return user;
        });

        res.json({ users: sanitizedUsers, total: count });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/users/:id/suspend', async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot suspend yourself' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .update({ suspended: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        delete user.password_hash;
        res.json({ message: 'User suspended successfully', user });
    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/users/:id/unsuspend', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .update({ suspended: false, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        delete user.password_hash;
        res.json({ message: 'User unsuspended successfully', user });
    } catch (error) {
        console.error('Error unsuspending user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ error: 'Failed to delete user' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== PRODUCT MANAGEMENT ====================
router.get('/products', async (req, res) => {
    try {
        const { limit = 50, offset = 0, status } = req.query;

        let query = supabase
            .from('products')
            .select(`
                *,
                seller:users(id, username, full_name, email),
                category:categories(id, name)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: products, error, count } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }

        res.json({ products, total: count });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

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

// ==================== CATEGORY MANAGEMENT ====================
router.get('/categories', async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
            return res.status(500).json({ error: 'Failed to fetch categories' });
        }

        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/categories', [
    body('name').notEmpty().withMessage('Category name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name } = req.body;

        const { data: category, error } = await supabase
            .from('categories')
            .insert([{ name }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Category already exists' });
            }
            console.error('Error creating category:', error);
            return res.status(500).json({ error: 'Failed to create category' });
        }

        res.status(201).json({ category });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/categories/:id', [
    body('name').notEmpty().withMessage('Category name is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name } = req.body;

        const { data: category, error } = await supabase
            .from('categories')
            .update({ name })
            .eq('id', id)
            .select()
            .single();

        if (error || !category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ category });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category is in use
        const { data: products, error: checkError } = await supabase
            .from('products')
            .select('id')
            .eq('category_id', id)
            .limit(1);

        if (products && products.length > 0) {
            return res.status(400).json({ error: 'Category is in use and cannot be deleted' });
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting category:', error);
            return res.status(500).json({ error: 'Failed to delete category' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== ADVERTISEMENT MANAGEMENT ====================
router.get('/advertisements', async (req, res) => {
    try {
        const { limit = 50, offset = 0, status } = req.query;

        let query = supabase
            .from('advertisements')
            .select(`
                *,
                user:users(id, username, full_name, email),
                approved_by_user:users!approved_by(id, username, full_name)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: advertisements, error, count } = await query;

        if (error) {
            console.error('Error fetching advertisements:', error);
            return res.status(500).json({ error: 'Failed to fetch advertisements' });
        }

        res.json({ advertisements, total: count });
    } catch (error) {
        console.error('Error fetching advertisements:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/advertisements/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: ad, error: fetchError } = await supabase
            .from('advertisements')
            .select('payment_status')
            .eq('id', id)
            .single();

        if (fetchError || !ad) {
            return res.status(404).json({ error: 'Advertisement not found' });
        }

        if (ad.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Cannot approve unpaid advertisement' });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from approval

        const { data: advertisement, error } = await supabase
            .from('advertisements')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: req.user.id,
                expires_at: expiresAt.toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error approving advertisement:', error);
            return res.status(500).json({ error: 'Failed to approve advertisement' });
        }

        res.json({ message: 'Advertisement approved successfully', advertisement });
    } catch (error) {
        console.error('Error approving advertisement:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/advertisements/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: advertisement, error } = await supabase
            .from('advertisements')
            .update({
                status: 'rejected',
                approved_at: new Date().toISOString(),
                approved_by: req.user.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error || !advertisement) {
            return res.status(404).json({ error: 'Advertisement not found' });
        }

        res.json({ message: 'Advertisement rejected', advertisement });
    } catch (error) {
        console.error('Error rejecting advertisement:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/advertisements/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: advertisement, error } = await supabase
            .from('advertisements')
            .update({
                status: 'paused',
                approved_at: new Date().toISOString(),
                approved_by: req.user.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error || !advertisement) {
            return res.status(404).json({ error: 'Advertisement not found' });
        }

        res.json({ message: 'Advertisement paused', advertisement });
    } catch (error) {
        console.error('Error pausing advertisement:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/advertisements/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('advertisements')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting advertisement:', error);
            return res.status(500).json({ error: 'Failed to delete advertisement' });
        }

        res.json({ message: 'Advertisement deleted successfully' });
    } catch (error) {
        console.error('Error deleting advertisement:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin create advertisement manually
router.post('/advertisements', [
    body('title').notEmpty().withMessage('Title is required'),
    body('user_id').notEmpty().withMessage('User ID is required'),
    body('package').isIn(['basic', 'standard', 'premium']).withMessage('Invalid package'),
    body('status').optional().isIn(['pending', 'approved', 'rejected', 'paused']),
    body('image').optional().isURL().withMessage('Image must be a valid URL')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, image, whatsapp, user_id, package: pkg, status = 'pending' } = req.body;

        // Verify user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user_id)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const packageDetails = {
            basic: { amount: 5000, duration_days: 7 },
            standard: { amount: 15000, duration_days: 30 },
            premium: { amount: 50000, duration_days: 90 }
        };

        const { amount, duration_days } = packageDetails[pkg];

        const { data: advertisement, error } = await supabase
            .from('advertisements')
            .insert([{
                title,
                description: description || '',
                image: image || null,
                whatsapp: whatsapp || null,
                user_id,
                package: pkg,
                amount,
                duration_days,
                status,
                payment_status: 'paid', // Admin created, so assume paid
                approved_at: status === 'approved' ? new Date().toISOString() : null,
                approved_by: status === 'approved' ? req.user.id : null,
                expires_at: status === 'approved' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating advertisement:', error);
            return res.status(500).json({ error: 'Failed to create advertisement' });
        }

        res.status(201).json({ advertisement });
    } catch (error) {
        console.error('Error creating advertisement:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== REPORT MANAGEMENT ====================
router.get('/reports', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('reports')
            .select(`
                *,
                reporter:users(id, username, full_name, email)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: reports, error, count } = await query;

        if (error) {
            console.error('Error fetching reports:', error);
            return res.status(500).json({ error: 'Failed to fetch reports' });
        }

        res.json({ reports, total: count });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/reports/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: report, error } = await supabase
            .from('reports')
            .update({ status: 'resolved' })
            .eq('id', id)
            .select()
            .single();

        if (error || !report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json({ message: 'Report resolved', report });
    } catch (error) {
        console.error('Error resolving report:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/reports/:id/dismiss', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: report, error } = await supabase
            .from('reports')
            .update({ status: 'dismissed' })
            .eq('id', id)
            .select()
            .single();

        if (error || !report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json({ message: 'Report dismissed', report });
    } catch (error) {
        console.error('Error dismissing report:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== PAYMENT MANAGEMENT ====================
router.get('/payments', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const { data: payments, error, count } = await supabase
            .from('advertisement_payments')
            .select(`
                *,
                user:users(id, username, full_name, email),
                advertisement:advertisements(id, title)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching payments:', error);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }

        res.json({ payments, total: count });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;