const { supabase } = require('../supabase/client');
const { initializeTransaction, verifyTransaction, generateReference } = require('./paystack');

const DEFAULT_PLANS = {
  FREE: { name: 'Free', price: 0, listing_limit: 5 },
  PRO: { name: 'Pro', price: 2590, listing_limit: 50 },
  BUSINESS: { name: 'Business', price: 7990, listing_limit: 150 }
};

async function getPlans() {
  const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('price');
  if (error) throw error;
  return data || [];
}

async function getCurrentSubscription(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'grace_period'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: free } = await supabase.from('subscription_plans').select('*').eq('code', 'FREE').single();
  return { status: 'active', plan: free || { code: 'FREE', ...DEFAULT_PLANS.FREE } };
}

async function createSubscriptionPayment(user, planCode) {
  const code = String(planCode || '').toUpperCase();
  const { data: plan, error } = await supabase.from('subscription_plans').select('*').eq('code', code).eq('is_active', true).single();
  if (error || !plan) throw Object.assign(new Error('Subscription plan not found'), { statusCode: 404 });
  if (plan.code === 'FREE') throw Object.assign(new Error('FREE does not require payment'), { statusCode: 400 });

  const reference = generateReference();
  const result = await initializeTransaction(user.email, Number(plan.price), reference, {
    type: 'subscription', user_id: user.id, plan_id: plan.id, plan_code: plan.code
  }, `${process.env.BACKEND_URL || 'https://shinex-marketplace.onrender.com'}/api/subscriptions/payment/callback`);
  if (!result.status) throw new Error('Failed to initialize subscription payment');

  await supabase.from('subscriptions').insert({
    user_id: user.id, plan_id: plan.id, status: 'pending', paystack_reference: reference
  });
  return { authorization_url: result.data.authorization_url, reference, plan };
}

async function activateFromPayment(reference) {
  const payment = await verifyTransaction(reference);
  if (!payment.status || !payment.data || payment.data.status !== 'success') throw new Error('Payment could not be verified');
  const meta = payment.data.metadata || {};
  if (meta.type !== 'subscription' || !meta.user_id || !meta.plan_id) throw new Error('Invalid subscription payment metadata');

  const { data: plan, error: planError } = await supabase.from('subscription_plans').select('*').eq('id', meta.plan_id).single();
  if (planError || !plan || Number(payment.data.amount) !== Math.round(Number(plan.price) * 100)) throw new Error('Payment amount does not match subscription plan');

  // Idempotency guard: Paystack can deliver the same successful payment twice
  // (webhook + browser callback racing each other). If this reference has
  // already been activated, return the existing row untouched instead of
  // re-running the activation side effects (which would otherwise re-expire
  // the subscription it just activated and push expires_at out again).
  const { data: alreadyActive } = await supabase.from('subscriptions').select('*, plan:subscription_plans(*)').eq('paystack_reference', reference).eq('status', 'active').maybeSingle();
  if (alreadyActive) return alreadyActive;

  const now = new Date();
  const expires = new Date(now); expires.setMonth(expires.getMonth() + 1);
  const grace = new Date(expires); grace.setDate(grace.getDate() + 7);

  await supabase.from('subscriptions').update({ status: 'expired' }).eq('user_id', meta.user_id).in('status', ['active','grace_period']);
  const { data: pending } = await supabase.from('subscriptions').select('id').eq('paystack_reference', reference).eq('status', 'pending').maybeSingle();
  let data, error;
  if (pending) {
    ({ data, error } = await supabase.from('subscriptions').update({ status: 'active', plan_id: plan.id, started_at: now.toISOString(), expires_at: expires.toISOString(), grace_period_ends_at: grace.toISOString() }).eq('id', pending.id).select('*, plan:subscription_plans(*)').single());
  } else {
    ({ data, error } = await supabase.from('subscriptions').insert({ user_id: meta.user_id, plan_id: plan.id, status: 'active', started_at: now.toISOString(), expires_at: expires.toISOString(), grace_period_ends_at: grace.toISOString(), paystack_reference: reference }).select('*, plan:subscription_plans(*)').single());
  }
  if (error) throw error;
  await supabase.rpc('create_shinex_notification', { p_user_id: meta.user_id, p_type: 'subscription_activated', p_title: 'Subscription activated', p_message: `${plan.name} is now active.`, p_data: { plan: plan.code } }).catch(() => {});
  return data;
}

async function processExpirations() {
  const now = new Date();
  const { data: rows, error } = await supabase.from('subscriptions').select('*, plan:subscription_plans(*)').in('status', ['active','grace_period']).not('expires_at','is',null).lte('expires_at', now.toISOString());
  if (error) throw error;
  let processed = 0;
  for (const sub of rows || []) {
    const graceEnd = sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : new Date(new Date(sub.expires_at).getTime() + 7*86400000);
    if (now <= graceEnd) {
      if (sub.status !== 'grace_period') {
        await supabase.from('subscriptions').update({ status: 'grace_period', grace_period_ends_at: graceEnd.toISOString() }).eq('id', sub.id);
        await supabase.rpc('create_shinex_notification', { p_user_id: sub.user_id, p_type: 'subscription_grace', p_title: 'Subscription expired', p_message: 'Your paid subscription expired. You have 7 days to renew before your account returns to FREE.', p_data: {} }).catch(() => {});
      }
      processed++;
      continue;
    }

    const { data: free } = await supabase.from('subscription_plans').select('*').eq('code','FREE').single();
    if (!free) continue;
    await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
    const { data: existingFree } = await supabase.from('subscriptions').select('id').eq('user_id', sub.user_id).eq('plan_id', free.id).in('status',['active']).maybeSingle();
    if (!existingFree) await supabase.from('subscriptions').insert({ user_id: sub.user_id, plan_id: free.id, status: 'active', started_at: now.toISOString() });

    const { data: listings } = await supabase.from('products').select('id,created_at').eq('user_id', sub.user_id).eq('is_active', true).eq('is_sold', false).in('listing_status',['approved','active']).order('created_at',{ascending:true});
    const keep = (listings || []).slice(0, Number(free.listing_limit));
    const archive = (listings || []).slice(Number(free.listing_limit));
    if (archive.length) {
      await supabase.from('products').update({ is_active: false, listing_status: 'archived', archived_at: now.toISOString(), archived_reason: 'Subscription expired beyond 7-day grace period; FREE plan limit applied.' }).in('id', archive.map(x => x.id));
    }
    if (keep.length) await supabase.from('products').update({ listing_status: 'approved', archived_at: null, archived_reason: null }).in('id', keep.map(x => x.id));
    await supabase.rpc('create_shinex_notification', { p_user_id: sub.user_id, p_type: 'subscription_downgraded', p_title: 'You are now on FREE', p_message: `Your paid subscription ended. Up to ${free.listing_limit} active listings remain public; older listings were archived safely.`, p_data: { archived_count: archive.length } }).catch(() => {});
    processed++;
  }
  return processed;
}

module.exports = { getPlans, getCurrentSubscription, createSubscriptionPayment, activateFromPayment, processExpirations };
