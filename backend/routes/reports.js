const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Create report (authenticated)
router.post('/', authMiddleware, [
    body('target_type').isIn(['product', 'user', 'advertisement']).withMessage('Invalid target type'),
    body('target_id').notEmpty().withMessage('Target ID is required'),
    body('reason').notEmpty().withMessage('Reason is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { target_type, target_id, reason, details } = req.body;

        // Verify target exists
        let tableName;
        if (target_type === 'product') tableName = 'products';
        else if (target_type === 'user') tableName = 'users';
        else if (target_type === 'advertisement') tableName = 'advertisements';

        const { data: target, error: targetError } = await supabase
            .from(tableName)
            .select('id')
            .eq('id', target_id)
            .single();

        if (targetError || !target) {
            return res.status(404).json({ error: 'Target not found' });
        }

        // Check if user already reported this target
        const { data: existing, error: checkError } = await supabase
            .from('reports')
            .select('id')
            .eq('reporter_id', req.user.id)
            .eq('target_type', target_type)
            .eq('target_id', target_id)
            .eq('status', 'pending')
            .single();

        if (existing) {
            return res.status(400).json({ error: 'You have already reported this' });
        }

        const { data: report, error } = await supabase
            .from('reports')
            .insert([{
                target_type,
                target_id,
                reason,
                details: details || null,
                reporter_id: req.user.id,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating report:', error);
            return res.status(500).json({ error: 'Failed to create report' });
        }

        res.status(201).json({ report });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's reports (authenticated)
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const { data: reports, error } = await supabase
            .from('reports')
            .select('*')
            .eq('reporter_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reports:', error);
            return res.status(500).json({ error: 'Failed to fetch reports' });
        }

        res.json({ reports });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;