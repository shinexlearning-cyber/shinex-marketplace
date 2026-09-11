const express = require('express');
const authMiddleware = require('../middleware/auth');
const { supabase } = require('../supabase/client');
const { getPlans, getCurrentSubscription, createSubscriptionPayment, activateFromPayment } = require('../services/subscriptions');
const { verifyWebhookSignature } = require('../services/paystack');
const router = express.Router();

router.get('/plans', async (req,res) => {
  try { res.json({ success:true, data: await getPlans() }); }
  catch(e){ console.error(e); res.status(500).json({success:false,message:'Failed to load subscription plans'}); }
});

router.get('/me', authMiddleware, async (req,res) => {
  try {
    const subscription = await getCurrentSubscription(req.user.id);
    const { count } = await supabase.from('products').select('id',{count:'exact',head:true}).eq('user_id',req.user.id).eq('is_active',true).eq('is_sold',false).in('listing_status',['approved','active']);
    res.json({success:true,data:{subscription,listing_count:count||0,listing_limit:Number(subscription.plan?.listing_limit||5)}});
  } catch(e){ console.error(e); res.status(500).json({success:false,message:'Failed to load subscription'}); }
});

router.post('/checkout', authMiddleware, async (req,res) => {
  try {
    const result = await createSubscriptionPayment(req.user, req.body?.plan_code);
    res.status(201).json({success:true,message:'Payment initialized',data:result});
  } catch(e){ console.error(e); res.status(e.statusCode||500).json({success:false,message:e.message||'Failed to initialize subscription payment'}); }
});


router.post('/webhook/paystack', async (req,res)=>{
  try {
    const signature=req.headers['x-paystack-signature'];
    if(!signature || !verifyWebhookSignature(signature, req.rawBody || Buffer.from(''))) return res.status(401).json({success:false,message:'Invalid webhook signature'});
    if(req.body?.event==='charge.success' && req.body?.data?.reference) {
      try { await activateFromPayment(req.body.data.reference); } catch(e) { console.error('Subscription webhook processing:',e.message); }
    }
    res.sendStatus(200);
  } catch(e){ console.error(e); res.sendStatus(400); }
});

router.get('/payment/callback', async (req,res) => {
  try {
    const reference = req.query.reference || req.query.trxref;
    if (!reference) return res.status(400).send('Missing payment reference');
    await activateFromPayment(reference);
    const frontend = process.env.FRONTEND_URL || 'https://shinexmarket.onrender.com';
    res.redirect(`${frontend}/?subscription=success`);
  } catch(e){ console.error(e); const frontend = process.env.FRONTEND_URL || 'https://shinexmarket.onrender.com'; res.redirect(`${frontend}/?subscription=failed`); }
});

module.exports = router;
