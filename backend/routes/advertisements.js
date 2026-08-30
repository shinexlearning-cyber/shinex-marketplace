const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const axios = require('axios');

// Get all approved advertisements (public)
router.get('/', async (req, res) => {
    try {
        const now = new Date().toISOString();

        const { data: advertisements, error } = await supabase
            .from('advertisements')
            .select(`
                *,
                user:users(id, username, full_name, avatar)
            `)
            .eq('status', 'approved')
            .eq('payment_status', 'paid')
            .gt('expires_at', now)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching advertisements:', error);
            return res.status(500).json({ error: 'Failed to fetch advertisements' });
        }

        res.json({ advertisements });
    } catch (error) {
        console.error('Error fetching advertisements:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's advertisements (authenticated)
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const { data: advertisements, error } = await supabase
            .from('advertisements')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user advertisements:', error);
            return res.status(500).json({ error: 'Failed to fetch advertisements' });
        }

        res.json({ advertisements });
    } catch (error) {
        console.error('Error fetching user advertisements:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create advertisement (authenticated)
router.post('/', authMiddleware, [
    body('title').notEmpty().withMessage('Title is required'),
    body('package').isIn(['basic', 'standard', 'premium']).withMessage('Invalid package selected'),
    body('whatsapp').optional().isString(),
    body('image').optional().isURL().withMessage('Image must be a valid URL')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, image, whatsapp, package } = req.body;

        // Calculate amount and duration based on package
        const packageDetails = {
            basic: { amount: 5000, duration_days: 7 },
            standard: { amount: 15000, duration_days: 30 },
            premium: { amount: 50000, duration_days: 90 }
        };

        const { amount, duration_days } = packageDetails[package];

        const { data: advertisement, error } = await supabase
            .from('advertisements')
            .insert([{
                title,
                description: description || '',
                image: image || null,
                whatsapp: whatsapp || null,
                user_id: req.user.id,
                package,
                amount,
                duration_days,
                status: 'pending',
                payment_status: 'unpaid'
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

// Initialize Paystack payment for advertisement
router.post('/:id/pay', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Get advertisement
        const { data: ad, error: adError } = await supabase
            .from('advertisements')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (adError || !ad) {
            return res.status(404).json({ error: 'Advertisement not found' });
        }

        if (ad.payment_status === 'paid') {
            return res.status(400).json({ error: 'Advertisement already paid for' });
        }

        // Generate reference
        const reference = `AD-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Initialize payment with Paystack
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: req.user.email,
                amount: ad.amount * 100, // Paystack uses kobo
                reference: reference,
                callback_url: `${process.env.FRONTEND_URL}/payment-callback`,
                metadata: {
                    ad_id: ad.id,
                    user_id: req.user.id
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.status) {
            // Save payment record
            const { error: paymentError } = await supabase
                .from('advertisement_payments')
                .insert([{
                    ad_id: ad.id,
                    user_id: req.user.id,
                    amount: ad.amount,
                    reference: reference,
                    status: 'pending'
                }]);

            if (paymentError) {
                console.error('Error saving payment record:', paymentError);
                return res.status(500).json({ error: 'Failed to save payment record' });
            }

            res.json({
                authorization_url: response.data.data.authorization_url,
                reference: reference
            });
        } else {
            res.status(400).json({ error: 'Payment initialization failed' });
        }
    } catch (error) {
        console.error('Error initializing payment:', error);
        res.status(500).json({ error: 'Failed to initialize payment' });
    }
});

// Verify Paystack payment (webhook)
router.post('/webhook/paystack', async (req, res) => {
    try {
        const event = req.body;

        // Verify webhook signature
        const signature = req.headers['x-paystack-signature'];
        const crypto = require('crypto');
        const hash = crypto
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
            .update(JSON.stringify(event))
            .digest('hex');

        if (hash !== signature) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        if (event.event === 'charge.success') {
            const { reference } = event.data;

            // Verify transaction
            const response = await axios.get(
                `https://api.paystack.co/transaction/verify/${reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                    }
                }
            );

            if (response.data.status && response.data.data.status === 'success') {
                const transaction = response.data.data;
                const metadata = transaction.metadata;

                // Update payment record
                const { error: paymentError } = await supabase
                    .from('advertisement_payments')
                    .update({
                        status: 'success',
                        paid_at: new Date().toISOString()
                    })
                    .eq('reference', reference);

                if (paymentError) {
                    console.error('Error updating payment:', paymentError);
                    return res.status(500).json({ error: 'Failed to update payment' });
                }

                // Update advertisement
                const { error: adError } = await supabase
                    .from('advertisements')
                    .update({
                        payment_status: 'paid',
                        status: 'pending' // Still needs admin approval
                    })
                    .eq('id', metadata.ad_id);

                if (adError) {
                    console.error('Error updating advertisement:', adError);
                    return res.status(500).json({ error: 'Failed to update advertisement' });
                }

                res.json({ status: 'success' });
            } else {
                // Update payment as failed
                await supabase
                    .from('advertisement_payments')
                    .update({ status: 'failed' })
                    .eq('reference', reference);

                res.json({ status: 'failed' });
            }
        } else {
            res.json({ status: 'ignored' });
        }
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Verify payment manually (frontend callback)
router.get('/verify/:reference', authMiddleware, async (req, res) => {
    try {
        const { reference } = req.params;

        // Get payment record
        const { data: payment, error: paymentError } = await supabase
            .from('advertisement_payments')
            .select('*')
            .eq('reference', reference)
            .eq('user_id', req.user.id)
            .single();

        if (paymentError || !payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (payment.status === 'success') {
            return res.json({ status: 'success', payment });
        }

        // Verify with Paystack
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        if (response.data.status && response.data.data.status === 'success') {
            const transaction = response.data.data;
            const metadata = transaction.metadata;

            // Update payment record
            await supabase
                .from('advertisement_payments')
                .update({
                    status: 'success',
                    paid_at: new Date().toISOString()
                })
                .eq('reference', reference);

            // Update advertisement
            await supabase
                .from('advertisements')
                .update({
                    payment_status: 'paid',
                    status: 'pending'
                })
                .eq('id', metadata.ad_id);

            res.json({ status: 'success' });
        } else {
            res.json({ status: 'pending' });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Update advertisement (authenticated)
router.put('/:id', authMiddleware, [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional(),
    body('whatsapp').optional(),
    body('image').optional().isURL().withMessage('Image must be a valid URL')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updates = req.body;

        // Check if advertisement exists and belongs to user
        const { data: existing, error: fetchError } = await supabase
            .from('advertisements')
            .select('user_id, payment_status')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Advertisement not found' });
        }

        if (existing.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own advertisements' });
        }

        if (existing.payment_status === 'paid') {
            return res.status(400).json({ error: 'Cannot edit paid advertisement' });
        }

        const { data: advertisement, error } = await supabase
            .from('advertisements')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating advertisement:', error);
            return res.status(500).json({ error: 'Failed to update advertisement' });
        }

        res.json({ advertisement });
    } catch (error) {
        console.error('Error updating advertisement:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete advertisement (authenticated)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if advertisement exists and belongs to user
        const { data: existing, error: fetchError } = await supabase
            .from('advertisements')
            .select('user_id, payment_status')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Advertisement not found' });
        }

        if (existing.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own advertisements' });
        }

        if (existing.payment_status === 'paid' && existing.status === 'approved') {
            return res.status(400).json({ error: 'Cannot delete approved advertisement' });
        }

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

module.exports = router;