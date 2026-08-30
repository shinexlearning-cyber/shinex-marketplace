const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get user by username (public)
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, full_name, avatar, bio, location, whatsapp, created_at')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update profile (authenticated)
router.put('/profile', authMiddleware, [
    body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('bio').optional(),
    body('location').optional(),
    body('phone').optional(),
    body('whatsapp').optional(),
    body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updates = req.body;

        // Don't allow updating sensitive fields
        delete updates.id;
        delete updates.username;
        delete updates.email;
        delete updates.password_hash;
        delete updates.is_admin;
        delete updates.suspended;
        delete updates.created_at;

        const { data: user, error } = await supabase
            .from('users')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            return res.status(500).json({ error: 'Failed to update profile' });
        }

        delete user.password_hash;
        res.json({ user });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Change password (authenticated)
router.post('/change-password', authMiddleware, [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { current_password, new_password } = req.body;

        // Get user with password
        const { data: user, error } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(current_password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newPasswordHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id);

        if (updateError) {
            console.error('Error updating password:', updateError);
            return res.status(500).json({ error: 'Failed to update password' });
        }

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete account (authenticated)
router.delete('/account', authMiddleware, async (req, res) => {
    try {
        // Check if user has any active listings
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('seller_id', req.user.id)
            .eq('status', 'active')
            .limit(1);

        if (productError) {
            console.error('Error checking products:', productError);
            return res.status(500).json({ error: 'Failed to check active listings' });
        }

        if (products && products.length > 0) {
            return res.status(400).json({
                error: 'You have active listings. Please delete or mark them as sold first.'
            });
        }

        // Delete user (cascade will delete related records)
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', req.user.id);

        if (error) {
            console.error('Error deleting account:', error);
            return res.status(500).json({ error: 'Failed to delete account' });
        }

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;