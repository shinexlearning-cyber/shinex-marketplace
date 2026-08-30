const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { body, validationResult } = require('express-validator');

// Submit contact form (public)
router.post('/', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, subject, message } = req.body;

        const { data: contact, error } = await supabase
            .from('contact_messages')
            .insert([{
                name,
                email,
                subject,
                message,
                status: 'unread'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error saving contact message:', error);
            return res.status(500).json({ error: 'Failed to send message' });
        }

        res.status(201).json({ message: 'Message sent successfully', contact });
    } catch (error) {
        console.error('Error submitting contact:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all contact messages (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: messages, error, count } = await query;

        if (error) {
            console.error('Error fetching contact messages:', error);
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }

        res.json({ messages, total: count });
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update message status (admin only)
router.put('/:id/status', authMiddleware, adminMiddleware, [
    body('status').isIn(['unread', 'read', 'replied']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { status } = req.body;

        const { data: message, error } = await supabase
            .from('contact_messages')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error || !message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json({ message: 'Message status updated', message });
    } catch (error) {
        console.error('Error updating message status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete message (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('contact_messages')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting message:', error);
            return res.status(500).json({ error: 'Failed to delete message' });
        }

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;