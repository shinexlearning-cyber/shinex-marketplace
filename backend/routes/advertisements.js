const express = require('express');
const { supabase } = require('../supabase/client');
const authMiddleware = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { uploadImage, deleteImage } = require('../services/cloudinary');
const { initializeTransaction, verifyTransaction, generateReference } = require('../services/paystack');
const { isValidUUID, addDays } = require('../utils/helpers');
const router = express.Router();

// Get available advertising durations/pricing
router.get('/pricing', async (req, res) => {
  try {
    const { data: durations, error } = await supabase
      .from('advertisement_durations')
      .select('*')
      .eq('is_active', true)
      .order('duration_days', { ascending: true });

    if (error) {
      console.error('Get pricing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing options'
      });
    }

    res.json({
      success: true,
      data: durations
    });
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing options'
    });
  }
});

// Create advertisement
router.post('/', authMiddleware, uploadSingle, async (req, res) => {
  try {
    const { title, description, duration_id } = req.body;

    // Validate required fields
    if (!title || !duration_id) {
      return res.status(400).json({
        success: false,
        message: 'Title and duration are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement image is required'
      });
    }

    // Validate duration
    const { data: duration, error: durationError } = await supabase
      .from('advertisement_durations')
      .select('*')
      .eq('id', duration_id)
      .eq('is_active', true)
      .single();

    if (durationError || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive duration selected'
      });
    }

    // Upload image
    let uploadResult;
    try {
      uploadResult = await uploadImage(req.file.buffer, 'shinex_ads');
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload advertisement image'
      });
    }

    // Create advertisement record
    const { data: advertisement, error: adError } = await supabase
      .from('advertisements')
      .insert([
        {
          user_id: req.user.id,
          duration_id: duration.id,
          title,
          description: description || '',
          image_url: uploadResult.url,
          image_public_id: uploadResult.publicId,
          duration_days: duration.duration_days,
          amount: duration.price,
          payment_status: 'pending',
          approval_status: 'pending'
        }
      ])
      .select('*')
      .single();

    if (adError) {
      console.error('Create advertisement error:', adError);
      // Clean up uploaded image
      await deleteImage(uploadResult.publicId);
      return res.status(500).json({
        success: false,
        message: 'Failed to create advertisement'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Advertisement created. Please proceed to payment.',
      data: {
        advertisement,
        payment_url: null // Will be generated when user initiates payment
      }
    });
  } catch (error) {
    console.error('Create advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement'
    });
  }
});

// Initialize payment for advertisement
router.post('/:id/pay', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement ID'
      });
    }

    // Get advertisement
    const { data: advertisement, error: adError } = await supabase
      .from('advertisements')
      .select(`
        *,
        user:users(id, username, email, full_name)
      `)
      .eq('id', id)
      .single();

    if (adError || !advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Check ownership
    if (advertisement.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this advertisement'
      });
    }

    // Check if already paid
    if (advertisement.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This advertisement has already been paid for'
      });
    }

    // Check if there's a pending payment
    const { data: existingPayment, error: paymentCheckError } = await supabase
      .from('advertisement_payments')
      .select('*')
      .eq('advertisement_id', id)
      .eq('status', 'pending')
      .single();

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'A pending payment already exists for this advertisement',
        data: {
          payment_reference: existingPayment.paystack_reference
        }
      });
    }

    // Generate unique reference
    const reference = generateReference();

    // Initialize Paystack transaction
    const paystackResponse = await initializeTransaction(
      advertisement.user.email,
      advertisement.amount,
      reference,
      {
        advertisement_id: advertisement.id,
        user_id: req.user.id
      }
    );

    if (!paystackResponse.status) {
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize payment. Please try again.'
      });
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('advertisement_payments')
      .insert([
        {
          advertisement_id: advertisement.id,
          user_id: req.user.id,
          paystack_reference: reference,
          amount: advertisement.amount,
          currency: 'NGN',
          status: 'pending'
        }
      ])
      .select('*')
      .single();

    if (paymentError) {
      console.error('Create payment record error:', paymentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment record'
      });
    }

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        reference: reference,
        payment_id: payment.id
      }
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment'
    });
  }
});

// Paystack callback
router.get('/payment/callback', async (req, res) => {
  try {
    const { reference, trxref } = req.query;

    if (!reference && !trxref) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const paymentRef = reference || trxref;

    // Verify the transaction
    const verification = await verifyTransaction(paymentRef);

    if (!verification.status) {
      // Redirect to frontend with error
      return res.redirect(`${process.env.FRONTEND_URL}/advertise?payment=failed&reference=${paymentRef}`);
    }

    const { data: paymentData } = verification;

    // Check if payment is already processed
    const { data: existingPayment, error: checkError } = await supabase
      .from('advertisement_payments')
      .select('*')
      .eq('paystack_reference', paymentRef)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check payment error:', checkError);
      return res.redirect(`${process.env.FRONTEND_URL}/advertise?payment=error`);
    }

    if (existingPayment && existingPayment.status === 'success') {
      // Already processed
      return res.redirect(`${process.env.FRONTEND_URL}/advertise?payment=success&reference=${paymentRef}`);
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('advertisement_payments')
      .update({
        status: paymentData.status === 'success' ? 'success' : 'failed',
        paid_at: paymentData.status === 'success' ? new Date().toISOString() : null,
        payment_channel: paymentData.channel || null
      })
      .eq('paystack_reference', paymentRef);

    if (updateError) {
      console.error('Update payment error:', updateError);
      return res.redirect(`${process.env.FRONTEND_URL}/advertise?payment=error`);
    }

    // If payment successful, update advertisement
    if (paymentData.status === 'success' && existingPayment) {
      // Get advertisement
      const { data: ad } = await supabase
        .from('advertisements')
        .select('*')
        .eq('id', existingPayment.advertisement_id)
        .single();

      if (ad) {
        const startDate = new Date();
        const endDate = addDays(startDate, ad.duration_days);

        await supabase
          .from('advertisements')
          .update({
            payment_status: 'paid',
            starts_at: startDate.toISOString(),
            expires_at: endDate.toISOString()
          })
          .eq('id', ad.id);
      }
    }

    // Redirect to frontend
    const status = paymentData.status === 'success' ? 'success' : 'failed';
    return res.redirect(`${process.env.FRONTEND_URL}/advertise?payment=${status}&reference=${paymentRef}`);
  } catch (error) {
    console.error('Payment callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/advertise?payment=error`);
  }
});

// Get payment status
router.get('/:id/payment', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement ID'
      });
    }

    // Get advertisement
    const { data: advertisement, error: adError } = await supabase
      .from('advertisements')
      .select('*')
      .eq('id', id)
      .single();

    if (adError || !advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    // Check ownership
    if (advertisement.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get payment
    const { data: payment, error: paymentError } = await supabase
      .from('advertisement_payments')
      .select('*')
      .eq('advertisement_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('Get payment error:', paymentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payment status'
      });
    }

    res.json({
      success: true,
      data: {
        advertisement: {
          payment_status: advertisement.payment_status,
          approval_status: advertisement.approval_status,
          starts_at: advertisement.starts_at,
          expires_at: advertisement.expires_at
        },
        payment: payment || null
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status'
    });
  }
});

// Get user's advertisements
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: advertisements, error, count } = await supabase
      .from('advertisements')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get user ads error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch advertisements'
      });
    }

    res.json({
      success: true,
      data: advertisements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Get user ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch advertisements'
    });
  }
});

// Webhook endpoint for Paystack
router.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'No signature provided' });
    }

    // Verify webhook signature
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventData = event.data;

    // Only process charge.success events
    if (event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const { reference } = eventData;

    // Check if payment already processed (idempotency)
    const { data: existingPayment, error: checkError } = await supabase
      .from('advertisement_payments')
      .select('*')
      .eq('paystack_reference', reference)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Webhook - Check payment error:', checkError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Skip if already processed
    if (existingPayment && existingPayment.status === 'success') {
      return res.status(200).json({ message: 'Payment already processed' });
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('advertisement_payments')
      .update({
        status: 'success',
        paid_at: new Date().toISOString(),
        payment_channel: eventData.channel || null
      })
      .eq('paystack_reference', reference);

    if (updateError) {
      console.error('Webhook - Update payment error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment' });
    }

    // If we have existing payment, update advertisement
    if (existingPayment) {
      const { data: ad } = await supabase
        .from('advertisements')
        .select('*')
        .eq('id', existingPayment.advertisement_id)
        .single();

      if (ad) {
        const startDate = new Date();
        const endDate = addDays(startDate, ad.duration_days);

        await supabase
          .from('advertisements')
          .update({
            payment_status: 'paid',
            starts_at: startDate.toISOString(),
            expires_at: endDate.toISOString()
          })
          .eq('id', ad.id);
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
