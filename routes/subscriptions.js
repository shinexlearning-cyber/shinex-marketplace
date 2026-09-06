const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { initializeTransaction, verifyTransaction, generateReference } = require('../services/paystack');
const router = express.Router();

// SHINEX PRO / SHINEX ENTERPRISE pricing (Part 11). Source of truth lives
// here on the backend — the frontend only displays these, never sets them.
const PLANS = {
  pro: { amount: 2500, label: 'SHINEX Pro', listing_limit: 30 },
  enterprise: { amount: 6000, label: 'SHINEX Enterprise', listing_limit: null }
};

router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: {
      starter: { amount: 0, label: 'Starter', listing_limit: 5 },
      ...PLANS
    }
  });
});

// Get the authenticated user's current plan/status.
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: {
      plan: req.user.plan || 'starter',
      plan_expires_at: req.user.plan_expires_at || null
    }
  });
});

// Start a subscription purchase — returns a Paystack checkout URL.
// Nothing is activated here; activation only happens after verification.
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan. Choose "pro" or "enterprise".' });
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    const reference = generateReference();
    const amount = PLANS[plan].amount;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: req.user.id,
        plan,
        amount,
        paystack_reference: reference,
        status: 'pending'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Create subscription error:', error);
      return res.status(500).json({ success: false, message: 'Failed to start subscription' });
    }

    const paystackResponse = await initializeTransaction(userRow.email, amount, reference, {
      type: 'subscription',
      plan,
      user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Redirect the user to authorization_url to complete payment',
      data: {
        subscription,
        authorization_url: paystackResponse.data.authorization_url,
        reference
      }
    });
  } catch (error) {
    console.error('Start subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to start subscription' });
  }
});

// Verify a subscription payment server-side against Paystack directly —
// never trust a frontend "payment succeeded" flag (Part 11/18).
router.get('/verify/:reference', authMiddleware, async (req, res) => {
  try {
    const { reference } = req.params;

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('paystack_reference', reference)
      .eq('user_id', req.user.id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    if (subscription.status === 'active') {
      return res.json({ success: true, message: 'Already active', data: subscription });
    }

    const verification = await verifyTransaction(reference);

    if (verification.data.status !== 'success') {
      await supabase.from('subscriptions').update({ status: 'failed' }).eq('id', subscription.id);
      return res.status(400).json({ success: false, message: 'Payment was not successful' });
    }

    const startsAt = new Date();
    const expiresAt = new Date(startsAt);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'active', starts_at: startsAt.toISOString(), expires_at: expiresAt.toISOString() })
      .eq('id', subscription.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Update subscription error:', updateError);
      return res.status(500).json({ success: false, message: 'Failed to activate subscription' });
    }

    // The backend is the sole source of truth for the user's active plan.
    await supabase
      .from('users')
      .update({ plan: subscription.plan, plan_expires_at: expiresAt.toISOString() })
      .eq('id', req.user.id);

    res.json({ success: true, message: 'Subscription activated', data: updatedSub });
  } catch (error) {
    console.error('Verify subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify subscription' });
  }
});

module.exports = router;
