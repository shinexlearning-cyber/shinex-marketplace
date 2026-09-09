import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import crypto from 'node:crypto';
import { z } from 'zod';
import { config, supabase, supabaseAdmin, cloudinary } from './config.js';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5, fields: 30 }
});
const idSchema = z.string().uuid();
const emailSchema = z.string().trim().email().max(254);
const pageSchema = z.coerce.number().int().min(1).max(10000).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(20);
const allowedOrigins = new Set([config.frontendUrl, config.adminFrontendUrl, 'http://localhost:5173', 'http://localhost:3000']);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({
  limit: '1mb',
  verify(req, res, buffer) {
    if (req.originalUrl === '/api/paystack/webhook') req.rawBody = Buffer.from(buffer);
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

const ok = (res, data = null, status = 200, pagination) => {
  const body = { success: true, data };
  if (pagination) body.pagination = pagination;
  return res.status(status).json(body);
};
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });
const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error(result.error.issues.map((issue) => issue.message).join(', '));
    error.status = 400;
    throw error;
  }
  return result.data;
};
const requireDb = () => {
  if (!supabaseAdmin || !supabase) {
    const error = new Error('Supabase is not configured');
    error.status = 503;
    throw error;
  }
};
const getBearer = (req) => {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};
const safeUser = (profile) => {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username || '',
    email: profile.email || '',
    full_name: profile.full_name || '',
    phone: profile.phone || null,
    avatar_url: profile.avatar_url || null,
    bio: profile.bio || null,
    location: profile.location || null,
    whatsapp: profile.whatsapp || null,
    shop_name: profile.shop_name || null,
    shop_description: profile.shop_description || null,
    is_admin: Boolean(profile.is_admin || profile.role === 'admin'),
    is_seller: Boolean(profile.is_seller),
    is_suspended: Boolean(profile.is_suspended),
    created_at: profile.created_at,
    plan: profile.plan || 'starter',
    plan_expires_at: profile.plan_expires_at || null
  };
};
const pagination = (page, limit, total) => ({ page, limit, total: total || 0, totalPages: Math.max(1, Math.ceil((total || 0) / limit)) });
const listParams = (req, defaultLimit = 20) => ({
  page: parse(pageSchema, req.query.page || 1),
  limit: parse(limitSchema, req.query.limit || defaultLimit)
});
const wrap = async (promise) => {
  const { data, error } = await promise;
  if (error) {
    const e = new Error(error.message);
    e.status = error.code === 'PGRST116' ? 404 : 400;
    throw e;
  }
  return data;
};
const selectProfile = async (id) => wrap(supabaseAdmin.from('profiles').select('*').eq('id', id).maybeSingle());
const recordActivity = async (userId, type, action, metadata = {}) => {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin.from('activity').insert({ user_id: userId, type, action, metadata });
  if (error) console.error('activity write failed:', error.message);
};
const authUser = async (req) => {
  requireDb();
  const token = getBearer(req);
  if (!token) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    const e = new Error('Invalid or expired session');
    e.status = 401;
    throw e;
  }
  let profile = await selectProfile(data.user.id);
  if (!profile) {
    const email = (data.user.email || '').toLowerCase();
    profile = await wrap(supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      email,
      username: data.user.user_metadata?.username || email.split('@')[0],
      full_name: data.user.user_metadata?.full_name || '',
      phone: data.user.user_metadata?.phone || null,
      is_admin: config.adminEmails.has(email)
    }).select('*').single());
  }
  if (profile.is_suspended) {
    const e = new Error('This account is suspended');
    e.status = 403;
    throw e;
  }
  return { auth: data.user, profile };
};
const requireAuth = async (req, res, next) => {
  try {
    req.identity = await authUser(req);
    next();
  } catch (error) {
    next(error);
  }
};
const requireAdmin = async (req, res, next) => {
  try {
    req.identity = await authUser(req);
    if (!req.identity.profile.is_admin && req.identity.profile.role !== 'admin') return fail(res, 'Admin access required', 403);
    next();
  } catch (error) {
    next(error);
  }
};
const queryCount = (result, page, limit) => pagination(page, limit, result.count);
const cloudUpload = (file, folder) => new Promise((resolve, reject) => {
  if (!file || !process.env.CLOUDINARY_CLOUD_NAME) return reject(Object.assign(new Error('Image uploads are not configured'), { status: 503 }));
  const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => {
    if (error) return reject(Object.assign(new Error('Image upload failed'), { status: 502 }));
    resolve(result.secure_url);
  });
  stream.end(file.buffer);
});
const validateId = (id) => parse(idSchema, id);
const money = (value) => Number(value || 0);
const productSelect = '*, category:categories(id,name,slug,description,icon,is_active), images:product_images(id,image_url,is_primary,display_order), seller:profiles!products_user_id_fkey(id,username,full_name,email,phone,avatar_url,shop_name,shop_description,location,whatsapp,bio)';
const formatProduct = (row) => ({
  ...row,
  price: money(row.price),
  seller: row.seller ? safeUser(row.seller) : null,
  primary_image: row.images?.find((image) => image.is_primary)?.image_url || row.images?.[0]?.image_url || null
});
const advertisementSelect = '*, user:profiles!advertisements_user_id_fkey(id,username,full_name,email), duration:ad_durations(id,duration_days,price)';
const formatAdvertisement = (row) => ({ ...row, amount: money(row.amount), duration_days: row.duration_days || row.duration?.duration_days || 0 });
const profileStats = async (id) => {
  const [products, advertisements, reports] = await Promise.all([
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabaseAdmin.from('advertisements').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', id)
  ]);
  return { products: products.count || 0, advertisements: advertisements.count || 0, reports: reports.count || 0 };
};

app.get('/api/health', (req, res) => ok(res, { message: 'SHINEX API is running' }));

// Authentication uses Supabase Auth, while profiles provide the app role and marketplace data.
app.post('/api/auth/register', async (req, res, next) => {
  try {
    requireDb();
    const body = parse(z.object({
      email: emailSchema, password: z.string().min(8).max(128), username: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
      full_name: z.string().trim().min(2).max(120), phone: z.string().trim().min(5).max(30), account_type: z.string().optional()
    }), req.body);
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email, password: body.password, email_confirm: true,
      user_metadata: { username: body.username, full_name: body.full_name, phone: body.phone }
    });
    if (createError) return fail(res, createError.message, createError.status || 400);
    const profile = await wrap(supabaseAdmin.from('profiles').insert({
      id: created.user.id, email: body.email.toLowerCase(), username: body.username, full_name: body.full_name, phone: body.phone,
      is_seller: body.account_type === 'sell' || body.account_type === 'both'
    }).select('*').single());
    const { data: session, error: loginError } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
    if (loginError || !session.session) return fail(res, 'Account created. Please sign in to continue.', 201);
    await recordActivity(profile.id, 'auth', 'registered');
    return ok(res, { user: safeUser(profile), token: session.session.access_token }, 201);
  } catch (error) { next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    requireDb();
    const body = parse(z.object({ email: emailSchema, password: z.string().min(1).max(128) }), req.body);
    const { data, error } = await supabase.auth.signInWithPassword(body);
    if (error || !data.session) return fail(res, 'Invalid email or password', 401);
    let profile = await selectProfile(data.user.id);
    if (!profile) {
      const email = (data.user.email || body.email).toLowerCase();
      profile = await wrap(supabaseAdmin.from('profiles').insert({
        id: data.user.id, email, username: data.user.user_metadata?.username || email.split('@')[0],
        full_name: data.user.user_metadata?.full_name || '', is_admin: config.adminEmails.has(email)
      }).select('*').single());
    }
    if (profile.is_suspended) return fail(res, 'This account is suspended', 403);
    await recordActivity(profile.id, 'auth', 'logged_in');
    return ok(res, { user: safeUser(profile), token: data.session.access_token });
  } catch (error) { next(error); }
});
app.get('/api/auth/me', requireAuth, (req, res) => ok(res, { user: safeUser(req.identity.profile) }));
app.post('/api/auth/logout', requireAuth, async (req, res, next) => {
  try { await recordActivity(req.identity.profile.id, 'auth', 'logged_out'); return ok(res, null); } catch (error) { next(error); }
});
app.post('/api/auth/forgot-password', async (req, res, next) => {
  try {
    requireDb();
    const { email } = parse(z.object({ email: emailSchema }), req.body);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${config.frontendUrl}/reset-password` });
    if (error) return fail(res, error.message, 400);
    return ok(res, { message: 'If an account exists, reset instructions were sent.' });
  } catch (error) { next(error); }
});
app.post('/api/auth/reset-password', async (req, res, next) => {
  try {
    requireDb();
    const { token, new_password } = parse(z.object({ token: z.string().min(10), new_password: z.string().min(8).max(128) }), req.body);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return fail(res, 'Invalid or expired reset token', 401);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, { password: new_password });
    if (updateError) return fail(res, updateError.message, 400);
    return ok(res, { message: 'Password updated successfully.' });
  } catch (error) { next(error); }
});

// Public and seller account routes.
app.get('/api/users/me', requireAuth, (req, res) => ok(res, { user: safeUser(req.identity.profile) }));
app.put('/api/users/me', requireAuth, async (req, res, next) => {
  try {
    const body = parse(z.object({
      username: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
      full_name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(30).optional(),
      bio: z.string().trim().max(1000).nullable().optional(), location: z.string().trim().max(160).nullable().optional(),
      whatsapp: z.string().trim().max(30).nullable().optional(), shop_name: z.string().trim().max(120).nullable().optional(),
      shop_description: z.string().trim().max(1000).nullable().optional()
    }), req.body);
    const profile = await wrap(supabaseAdmin.from('profiles').update(body).eq('id', req.identity.profile.id).select('*').single());
    await recordActivity(profile.id, 'profile', 'updated');
    return ok(res, { user: safeUser(profile) });
  } catch (error) { next(error); }
});
app.post('/api/users/me/avatar', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.mimetype.startsWith('image/')) return fail(res, 'A valid image is required');
    const avatar_url = await cloudUpload(req.file, 'shinex/avatars');
    const profile = await wrap(supabaseAdmin.from('profiles').update({ avatar_url }).eq('id', req.identity.profile.id).select('*').single());
    return ok(res, { user: safeUser(profile) });
  } catch (error) { next(error); }
});
app.get('/api/users/:username', async (req, res, next) => {
  try {
    requireDb();
    const profile = await wrap(supabaseAdmin.from('profiles').select('*').eq('username', req.params.username).maybeSingle());
    if (!profile) return fail(res, 'Seller not found', 404);
    const count = await supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('approval_status', 'approved').eq('is_active', true);
    return ok(res, { user: safeUser(profile), shop: { ...safeUser(profile), product_count: count.count || 0 } });
  } catch (error) { next(error); }
});
app.get('/api/users/:username/shop', async (req, res, next) => {
  try {
    requireDb();
    const { page, limit } = listParams(req);
    const profile = await wrap(supabaseAdmin.from('profiles').select('*').eq('username', req.params.username).maybeSingle());
    if (!profile) return fail(res, 'Seller not found', 404);
    const result = await supabaseAdmin.from('products').select(productSelect, { count: 'exact' }).eq('user_id', profile.id).eq('approval_status', 'approved').eq('is_active', true).order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    if (result.error) throw new Error(result.error.message);
    return ok(res, { shop: { ...safeUser(profile), product_count: result.count || 0 }, products: result.data.map(formatProduct), pagination: queryCount(result, page, limit) });
  } catch (error) { next(error); }
});

app.get('/api/products/categories/all', async (req, res, next) => {
  try { requireDb(); return ok(res, await wrap(supabaseAdmin.from('categories').select('*').eq('is_active', true).order('name'))); } catch (error) { next(error); }
});
app.get('/api/products', async (req, res, next) => {
  try {
    requireDb();
    const { page, limit } = listParams(req);
    let query = supabaseAdmin.from('products').select(productSelect, { count: 'exact' }).eq('approval_status', 'approved').eq('is_active', true).eq('is_sold', false);
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (search) {
      const safeSearch = search.replace(/[(),]/g, ' ');
      query = query.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%`);
    }
    if (req.query.condition) query = query.eq('condition', String(req.query.condition));
    if (req.query.seller) query = query.eq('user_id', String(req.query.seller));
    if (req.query.category) {
      const category = await supabaseAdmin.from('categories').select('id').or(`id.eq.${req.query.category},slug.eq.${req.query.category}`).maybeSingle();
      if (category.data?.id) query = query.eq('category_id', category.data.id);
    }
    const sort = req.query.sort === 'price_asc' ? { column: 'price', ascending: true } : req.query.sort === 'price_desc' ? { column: 'price', ascending: false } : { column: 'created_at', ascending: false };
    const result = await query.order(sort.column, { ascending: sort.ascending }).range((page - 1) * limit, page * limit - 1);
    if (result.error) throw new Error(result.error.message);
    return ok(res, result.data.map(formatProduct), 200, queryCount(result, page, limit));
  } catch (error) { next(error); }
});
app.get('/api/products/mine/all', requireAuth, async (req, res, next) => {
  try {
    const { page, limit } = listParams(req, 50);
    let query = supabaseAdmin.from('products').select(productSelect, { count: 'exact' }).eq('user_id', req.identity.profile.id).order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('approval_status', String(req.query.status));
    const result = await query.range((page - 1) * limit, page * limit - 1);
    if (result.error) throw new Error(result.error.message);
    return ok(res, result.data.map(formatProduct), 200, queryCount(result, page, limit));
  } catch (error) { next(error); }
});
app.get('/api/products/:id', async (req, res, next) => {
  try {
    requireDb(); const id = validateId(req.params.id);
    const product = await wrap(supabaseAdmin.from('products').select(productSelect).eq('id', id).maybeSingle());
    if (!product || (product.approval_status !== 'approved' && !getBearer(req))) return fail(res, 'Product not found', 404);
    await supabaseAdmin.from('products').update({ views_count: (product.views_count || 0) + 1 }).eq('id', id);
    return ok(res, formatProduct(product));
  } catch (error) { next(error); }
});
const productBody = z.object({ name: z.string().trim().min(2).max(160), price: z.coerce.number().nonnegative().max(100000000000), category_id: z.string().uuid(), description: z.string().trim().max(5000), condition: z.enum(['new', 'used', 'refurbished']), location: z.string().trim().max(160) });
app.post('/api/products', requireAuth, upload.array('images', 5), async (req, res, next) => {
  try {
    const body = productBody.parse(req.body);
    const product = await wrap(supabaseAdmin.from('products').insert({ ...body, user_id: req.identity.profile.id, price: Number(body.price), approval_status: 'pending', is_active: true, is_sold: false }).select('*').single());
    const files = (req.files || []).filter((file) => file.mimetype.startsWith('image/'));
    const urls = await Promise.all(files.map((file) => cloudUpload(file, 'shinex/products')));
    if (urls.length) await wrap(supabaseAdmin.from('product_images').insert(urls.map((image_url, index) => ({ product_id: product.id, image_url, is_primary: index === 0, display_order: index }))));
    await recordActivity(product.user_id, 'product', 'created', { product_id: product.id });
    return ok(res, { product: formatProduct({ ...product, images: urls.map((image_url, i) => ({ id: crypto.randomUUID(), image_url, is_primary: i === 0, display_order: i })) }) }, 201);
  } catch (error) { next(error); }
});
const ownerProduct = async (req) => {
  const id = validateId(req.params.id);
  const product = await wrap(supabaseAdmin.from('products').select('*').eq('id', id).maybeSingle());
  if (!product) { const e = new Error('Product not found'); e.status = 404; throw e; }
  if (product.user_id !== req.identity.profile.id && !req.identity.profile.is_admin) { const e = new Error('You do not own this product'); e.status = 403; throw e; }
  return product;
};
app.put('/api/products/:id', requireAuth, upload.array('images', 5), async (req, res, next) => {
  try {
    const product = await ownerProduct(req);
    const body = productBody.partial().parse(req.body);
    const updated = await wrap(supabaseAdmin.from('products').update({ ...body, price: body.price === undefined ? undefined : Number(body.price), approval_status: req.identity.profile.is_admin ? product.approval_status : 'pending' }).eq('id', product.id).select('*').single());
    const files = (req.files || []).filter((file) => file.mimetype.startsWith('image/'));
    if (files.length) {
      const urls = await Promise.all(files.map((file) => cloudUpload(file, 'shinex/products')));
      await wrap(supabaseAdmin.from('product_images').insert(urls.map((image_url, index) => ({ product_id: product.id, image_url, is_primary: index === 0, display_order: index }))));
    }
    return ok(res, { product: formatProduct(updated) });
  } catch (error) { next(error); }
});
app.delete('/api/products/:id', requireAuth, async (req, res, next) => {
  try { const product = await ownerProduct(req); await wrap(supabaseAdmin.from('products').delete().eq('id', product.id)); await recordActivity(req.identity.profile.id, 'product', 'deleted', { product_id: product.id }); return ok(res, null); } catch (error) { next(error); }
});
app.patch('/api/products/:id/sold', requireAuth, async (req, res, next) => {
  try { const product = await ownerProduct(req); const { is_sold } = parse(z.object({ is_sold: z.boolean() }), req.body); return ok(res, await wrap(supabaseAdmin.from('products').update({ is_sold }).eq('id', product.id).select('*').single())); } catch (error) { next(error); }
});

// Favorites.
app.get('/api/favorites/products', requireAuth, async (req, res, next) => {
  try {
    const result = await wrap(supabaseAdmin.from('favorite_products').select('id,created_at,product:products(*)').eq('user_id', req.identity.profile.id).order('created_at', { ascending: false }).limit(50));
    return ok(res, result.map((row) => ({ id: row.id, created_at: row.created_at, product: row.product ? formatProduct(row.product) : null })));
  } catch (error) { next(error); }
});
app.get('/api/favorites/sellers', requireAuth, async (req, res, next) => { try { return ok(res, (await wrap(supabaseAdmin.from('favorite_sellers').select('id,created_at,seller:profiles!favorite_sellers_seller_id_fkey(*)').eq('user_id', req.identity.profile.id).limit(50))).map((row) => ({ ...row, seller: safeUser(row.seller) }))); } catch (error) { next(error); } });
app.get('/api/favorites/product/:id/check', requireAuth, async (req, res, next) => { try { validateId(req.params.id); const row = await wrap(supabaseAdmin.from('favorite_products').select('id').eq('user_id', req.identity.profile.id).eq('product_id', req.params.id).maybeSingle()); return ok(res, { is_favorited: Boolean(row) }); } catch (error) { next(error); } });
app.get('/api/favorites/seller/:id/check', requireAuth, async (req, res, next) => { try { validateId(req.params.id); const row = await wrap(supabaseAdmin.from('favorite_sellers').select('id').eq('user_id', req.identity.profile.id).eq('seller_id', req.params.id).maybeSingle()); return ok(res, { is_favorited: Boolean(row) }); } catch (error) { next(error); } });
app.post('/api/favorites/product/:id', requireAuth, async (req, res, next) => { try { const product_id = validateId(req.params.id); await wrap(supabaseAdmin.from('favorite_products').upsert({ user_id: req.identity.profile.id, product_id }, { onConflict: 'user_id,product_id' })); return ok(res, { is_favorited: true }); } catch (error) { next(error); } });
app.delete('/api/favorites/product/:id', requireAuth, async (req, res, next) => { try { const product_id = validateId(req.params.id); await wrap(supabaseAdmin.from('favorite_products').delete().eq('user_id', req.identity.profile.id).eq('product_id', product_id)); return ok(res, { is_favorited: false }); } catch (error) { next(error); } });
app.post('/api/favorites/seller/:id', requireAuth, async (req, res, next) => { try { const seller_id = validateId(req.params.id); await wrap(supabaseAdmin.from('favorite_sellers').upsert({ user_id: req.identity.profile.id, seller_id }, { onConflict: 'user_id,seller_id' })); return ok(res, { is_favorited: true }); } catch (error) { next(error); } });
app.delete('/api/favorites/seller/:id', requireAuth, async (req, res, next) => { try { const seller_id = validateId(req.params.id); await wrap(supabaseAdmin.from('favorite_sellers').delete().eq('user_id', req.identity.profile.id).eq('seller_id', seller_id)); return ok(res, { is_favorited: false }); } catch (error) { next(error); } });

// Advertisements, subscriptions, and Paystack.
app.get('/api/advertisements/pricing', async (req, res, next) => { try { requireDb(); return ok(res, (await wrap(supabaseAdmin.from('ad_durations').select('*').eq('is_active', true).order('duration_days'))).map((row) => ({ ...row, price: money(row.price) }))); } catch (error) { next(error); } });
app.get('/api/advertisements/my', requireAuth, async (req, res, next) => { try { return ok(res, (await wrap(supabaseAdmin.from('advertisements').select(advertisementSelect).eq('user_id', req.identity.profile.id).order('created_at', { ascending: false }).limit(50))).map(formatAdvertisement)); } catch (error) { next(error); } });
app.post('/api/advertisements', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const body = parse(z.object({ title: z.string().trim().min(2).max(160), description: z.string().trim().max(5000), duration_id: z.string().uuid() }), req.body);
    if (!req.file || !req.file.mimetype.startsWith('image/')) return fail(res, 'A banner image is required');
    const duration = await wrap(supabaseAdmin.from('ad_durations').select('*').eq('id', body.duration_id).eq('is_active', true).maybeSingle());
    if (!duration) return fail(res, 'Advertisement duration is not available', 400);
    const image_url = await cloudUpload(req.file, 'shinex/advertisements');
    const ad = await wrap(supabaseAdmin.from('advertisements').insert({ ...body, user_id: req.identity.profile.id, image_url, amount: duration.price, duration_days: duration.duration_days, payment_status: 'pending', approval_status: 'pending' }).select(advertisementSelect).single());
    return ok(res, { advertisement: formatAdvertisement(ad), payment_url: null }, 201);
  } catch (error) { next(error); }
});
const paystack = async (path, init = {}) => {
  if (!config.paystackSecretKey) { const e = new Error('Paystack is not configured'); e.status = 503; throw e; }
  const response = await fetch(`https://api.paystack.co${path}`, { ...init, headers: { Authorization: `Bearer ${config.paystackSecretKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.status) { const e = new Error(json.message || 'Paystack request failed'); e.status = response.status >= 400 ? 502 : 400; throw e; }
  return json.data;
};
const createPayment = async ({ userId, amount, type, advertisementId, reference }) => wrap(supabaseAdmin.from('payments').insert({ user_id: userId, amount, payment_type: type, advertisement_id: advertisementId || null, paystack_reference: reference, status: 'initialized' }).select('*').single());
app.post('/api/advertisements/:id/pay', requireAuth, async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const ad = await wrap(supabaseAdmin.from('advertisements').select('*').eq('id', id).eq('user_id', req.identity.profile.id).maybeSingle());
    if (!ad) return fail(res, 'Advertisement not found', 404);
    const reference = `SHINEX-AD-${crypto.randomUUID()}`;
    const transaction = await paystack('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email: req.identity.profile.email, amount: Math.round(Number(ad.amount) * 100), reference, callback_url: `${config.frontendUrl}/advertise` }) });
    await createPayment({ userId: req.identity.profile.id, amount: ad.amount, type: 'advertisement', advertisementId: id, reference });
    return ok(res, { authorization_url: transaction.authorization_url, reference });
  } catch (error) { next(error); }
});
app.get('/api/subscriptions/plans', async (req, res, next) => { try { requireDb(); const plans = await wrap(supabaseAdmin.from('subscription_plans').select('*').eq('is_active', true).order('amount')); return ok(res, Object.fromEntries(plans.map((p) => [p.slug, { amount: money(p.amount), label: p.label, listing_limit: p.listing_limit }]))); } catch (error) { next(error); } });
app.get('/api/subscriptions/me', requireAuth, async (req, res, next) => { try { return ok(res, { plan: req.identity.profile.plan || 'starter', plan_expires_at: req.identity.profile.plan_expires_at || null }); } catch (error) { next(error); } });
app.post('/api/subscriptions', requireAuth, async (req, res, next) => {
  try {
    const { plan } = parse(z.object({ plan: z.string().min(1).max(40) }), req.body);
    const selected = await wrap(supabaseAdmin.from('subscription_plans').select('*').eq('slug', plan).eq('is_active', true).maybeSingle());
    if (!selected || !Number(selected.amount)) return fail(res, 'Subscription plan is not available', 400);
    const reference = `SHINEX-SUB-${crypto.randomUUID()}`;
    const transaction = await paystack('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email: req.identity.profile.email, amount: Math.round(Number(selected.amount) * 100), reference, callback_url: `${config.frontendUrl}/subscriptions` }) });
    const payment = await createPayment({ userId: req.identity.profile.id, amount: selected.amount, type: 'subscription', reference });
    await wrap(supabaseAdmin.from('subscriptions').insert({ user_id: req.identity.profile.id, plan: selected.slug, amount: selected.amount, status: 'pending', payment_id: payment.id }));
    return ok(res, { subscription: { plan: selected.slug, status: 'pending' }, authorization_url: transaction.authorization_url, reference });
  } catch (error) { next(error); }
});
app.get('/api/subscriptions/verify/:reference', requireAuth, async (req, res, next) => {
  try {
    const reference = req.params.reference.slice(0, 100);
    const payment = await wrap(supabaseAdmin.from('payments').select('*').eq('paystack_reference', reference).eq('user_id', req.identity.profile.id).maybeSingle());
    if (!payment) return fail(res, 'Payment not found', 404);
    const result = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
    const status = result.status === 'success' ? 'paid' : 'failed';
    await wrap(supabaseAdmin.from('payments').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null, provider_payload: result }).eq('id', payment.id));
    if (status === 'paid' && payment.payment_type === 'advertisement' && payment.advertisement_id) await wrap(supabaseAdmin.from('advertisements').update({ payment_status: 'paid' }).eq('id', payment.advertisement_id).eq('user_id', req.identity.profile.id));
    if (status === 'paid' && payment.payment_type === 'subscription') {
      const subscription = await wrap(supabaseAdmin.from('subscriptions').select('*').eq('payment_id', payment.id).maybeSingle());
      if (subscription) {
        const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
        await wrap(supabaseAdmin.from('subscriptions').update({ status: 'active', starts_at: new Date().toISOString(), expires_at: expiry.toISOString() }).eq('id', subscription.id));
        await wrap(supabaseAdmin.from('profiles').update({ plan: subscription.plan, plan_expires_at: expiry.toISOString() }).eq('id', req.identity.profile.id));
      }
    }
    return ok(res, { ...result, verified: status === 'paid' });
  } catch (error) { next(error); }
});
app.post('/api/paystack/webhook', async (req, res, next) => {
  try {
    if (!config.paystackSecretKey) return res.sendStatus(503);
    const signature = req.get('x-paystack-signature');
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expected = crypto.createHmac('sha512', config.paystackSecretKey).update(rawBody).digest('hex');
    if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.sendStatus(401);
    const event = JSON.parse(rawBody.toString());
    if (event.event === 'charge.success' && event.data?.reference) {
      const payment = await supabaseAdmin.from('payments').select('*').eq('paystack_reference', event.data.reference).maybeSingle();
      if (payment.data && payment.data.status !== 'paid') await supabaseAdmin.from('payments').update({ status: 'paid', paid_at: new Date().toISOString(), provider_payload: event.data }).eq('id', payment.data.id);
    }
    return res.sendStatus(200);
  } catch (error) { next(error); }
});

// Reports and contact.
app.get('/api/reports/my', requireAuth, async (req, res, next) => { try { return ok(res, await wrap(supabaseAdmin.from('reports').select('*, target_product:products(id,name)').eq('reporter_id', req.identity.profile.id).order('created_at', { ascending: false }).limit(50))); } catch (error) { next(error); } });
app.post('/api/reports', requireAuth, async (req, res, next) => { try { const body = parse(z.object({ target_product_id: z.string().uuid().optional(), target_user_id: z.string().uuid().optional(), target_advertisement_id: z.string().uuid().optional(), reason: z.string().trim().min(2).max(120), description: z.string().trim().max(3000) }), req.body); const report = await wrap(supabaseAdmin.from('reports').insert({ ...body, reporter_id: req.identity.profile.id, status: 'open' }).select('*').single()); return ok(res, report, 201); } catch (error) { next(error); } });
app.get('/api/contact/info', (req, res) => ok(res, config.contact));
app.post('/api/contact', async (req, res, next) => { try { const body = parse(z.object({ name: z.string().trim().min(2).max(120), email: emailSchema, phone: z.string().trim().max(30), subject: z.string().trim().min(2).max(180), message: z.string().trim().min(5).max(5000) }), req.body); requireDb(); await wrap(supabaseAdmin.from('contact_messages').insert(body)); return ok(res, { message: 'Your message has been received.' }, 201); } catch (error) { next(error); } });
app.get('/api/activity', requireAuth, async (req, res, next) => { try { return ok(res, await wrap(supabaseAdmin.from('activity').select('*').eq('user_id', req.identity.profile.id).order('created_at', { ascending: false }).limit(50))); } catch (error) { next(error); } });

// Admin routes. The role is read from the server-side profile, never from request input.
const adminList = async (table, req, select, extra = () => {}) => {
  const { page, limit } = listParams(req);
  let query = supabaseAdmin.from(table).select(select, { count: 'exact' }).order('created_at', { ascending: false });
  query = extra(query);
  const result = await query.range((page - 1) * limit, page * limit - 1);
  if (result.error) throw new Error(result.error.message);
  return { data: result.data, pagination: queryCount(result, page, limit) };
};
app.get('/api/admin/users', requireAdmin, async (req, res, next) => { try { const result = await adminList('profiles', req, '*', (q) => { const search = String(req.query.search || '').trim(); return search ? q.or(`username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`) : q; }); return ok(res, result.data.map((u) => ({ ...safeUser(u), stats: undefined })), 200, result.pagination); } catch (error) { next(error); } });
app.get('/api/admin/users/:id', requireAdmin, async (req, res, next) => { try { const user = await selectProfile(validateId(req.params.id)); if (!user) return fail(res, 'User not found', 404); return ok(res, { ...safeUser(user), stats: await profileStats(user.id) }); } catch (error) { next(error); } });
app.patch('/api/admin/users/:id/suspend', requireAdmin, async (req, res, next) => { try { const id = validateId(req.params.id); const { reason } = parse(z.object({ reason: z.string().trim().min(2).max(500) }), req.body); if (id === req.identity.profile.id) return fail(res, 'You cannot suspend your own account', 400); return ok(res, safeUser(await wrap(supabaseAdmin.from('profiles').update({ is_suspended: true, suspension_reason: reason }).eq('id', id).select('*').single()))); } catch (error) { next(error); } });
app.patch('/api/admin/users/:id/unsuspend', requireAdmin, async (req, res, next) => { try { return ok(res, safeUser(await wrap(supabaseAdmin.from('profiles').update({ is_suspended: false, suspension_reason: null }).eq('id', validateId(req.params.id)).select('*').single()))); } catch (error) { next(error); } });
app.patch('/api/admin/users/:id/set-admin', requireAdmin, async (req, res, next) => { try { const { is_admin } = parse(z.object({ is_admin: z.boolean() }), req.body); const id = validateId(req.params.id); if (id === req.identity.profile.id && !is_admin) return fail(res, 'You cannot remove your own admin access', 400); return ok(res, safeUser(await wrap(supabaseAdmin.from('profiles').update({ is_admin, role: is_admin ? 'admin' : 'user' }).eq('id', id).select('*').single()))); } catch (error) { next(error); } });
app.delete('/api/admin/users/:id', requireAdmin, async (req, res, next) => { try { const id = validateId(req.params.id); if (id === req.identity.profile.id) return fail(res, 'You cannot delete your own account', 400); await supabaseAdmin.auth.admin.deleteUser(id); return ok(res, null); } catch (error) { next(error); } });
app.get('/api/admin/products', requireAdmin, async (req, res, next) => { try { const result = await adminList('products', req, productSelect, (q) => req.query.status ? q.eq('approval_status', String(req.query.status)) : q); return ok(res, result.data.map(formatProduct), 200, result.pagination); } catch (error) { next(error); } });
app.get('/api/admin/products/:id', requireAdmin, async (req, res, next) => { try { const row = await wrap(supabaseAdmin.from('products').select(productSelect).eq('id', validateId(req.params.id)).maybeSingle()); if (!row) return fail(res, 'Product not found', 404); return ok(res, formatProduct(row)); } catch (error) { next(error); } });
app.patch('/api/admin/products/:id/approve', requireAdmin, async (req, res, next) => { try { return ok(res, formatProduct(await wrap(supabaseAdmin.from('products').update({ approval_status: 'approved', rejection_reason: null, is_active: true }).eq('id', validateId(req.params.id)).select(productSelect).single()))); } catch (error) { next(error); } });
app.patch('/api/admin/products/:id/reject', requireAdmin, async (req, res, next) => { try { const { reason } = parse(z.object({ reason: z.string().trim().min(2).max(500) }), req.body); return ok(res, formatProduct(await wrap(supabaseAdmin.from('products').update({ approval_status: 'rejected', rejection_reason: reason }).eq('id', validateId(req.params.id)).select(productSelect).single()))); } catch (error) { next(error); } });
app.delete('/api/admin/products/:id', requireAdmin, async (req, res, next) => { try { await wrap(supabaseAdmin.from('products').delete().eq('id', validateId(req.params.id))); return ok(res, null); } catch (error) { next(error); } });
app.get('/api/admin/categories', requireAdmin, async (req, res, next) => { try { return ok(res, await wrap(supabaseAdmin.from('categories').select('*').order('name'))); } catch (error) { next(error); } });
app.post('/api/admin/categories', requireAdmin, async (req, res, next) => { try { const body = parse(z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(500), icon: z.string().trim().max(80).optional() }), req.body); return ok(res, await wrap(supabaseAdmin.from('categories').insert({ ...body, slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }).select('*').single()), 201); } catch (error) { next(error); } });
app.put('/api/admin/categories/:id', requireAdmin, async (req, res, next) => { try { const body = parse(z.object({ name: z.string().trim().min(2).max(80).optional(), description: z.string().trim().max(500).optional(), icon: z.string().trim().max(80).optional(), is_active: z.boolean().optional() }), req.body); return ok(res, await wrap(supabaseAdmin.from('categories').update(body).eq('id', validateId(req.params.id)).select('*').single())); } catch (error) { next(error); } });
app.delete('/api/admin/categories/:id', requireAdmin, async (req, res, next) => { try { await wrap(supabaseAdmin.from('categories').delete().eq('id', validateId(req.params.id))); return ok(res, null); } catch (error) { next(error); } });
app.get('/api/admin/advertisements', requireAdmin, async (req, res, next) => { try { const result = await adminList('advertisements', req, advertisementSelect, (q) => req.query.status ? q.eq('approval_status', String(req.query.status)) : q); return ok(res, result.data.map(formatAdvertisement), 200, result.pagination); } catch (error) { next(error); } });
app.get('/api/admin/advertisements/:id', requireAdmin, async (req, res, next) => { try { return ok(res, formatAdvertisement(await wrap(supabaseAdmin.from('advertisements').select(advertisementSelect).eq('id', validateId(req.params.id)).maybeSingle()))); } catch (error) { next(error); } });
app.patch('/api/admin/advertisements/:id/approve', requireAdmin, async (req, res, next) => { try { return ok(res, formatAdvertisement(await wrap(supabaseAdmin.from('advertisements').update({ approval_status: 'approved', rejection_reason: null }).eq('id', validateId(req.params.id)).select(advertisementSelect).single()))); } catch (error) { next(error); } });
app.patch('/api/admin/advertisements/:id/reject', requireAdmin, async (req, res, next) => { try { const { reason } = parse(z.object({ reason: z.string().trim().min(2).max(500) }), req.body); return ok(res, formatAdvertisement(await wrap(supabaseAdmin.from('advertisements').update({ approval_status: 'rejected', rejection_reason: reason }).eq('id', validateId(req.params.id)).select(advertisementSelect).single()))); } catch (error) { next(error); } });
app.patch('/api/admin/advertisements/:id/pause', requireAdmin, async (req, res, next) => { try { return ok(res, formatAdvertisement(await wrap(supabaseAdmin.from('advertisements').update({ approval_status: 'paused' }).eq('id', validateId(req.params.id)).select(advertisementSelect).single()))); } catch (error) { next(error); } });
app.delete('/api/admin/advertisements/:id', requireAdmin, async (req, res, next) => { try { await wrap(supabaseAdmin.from('advertisements').delete().eq('id', validateId(req.params.id))); return ok(res, null); } catch (error) { next(error); } });
app.get('/api/admin/durations', requireAdmin, async (req, res, next) => { try { return ok(res, (await wrap(supabaseAdmin.from('ad_durations').select('*').order('duration_days'))).map((r) => ({ ...r, price: money(r.price) }))); } catch (error) { next(error); } });
app.post('/api/admin/durations', requireAdmin, async (req, res, next) => { try { const body = parse(z.object({ duration_days: z.coerce.number().int().positive().max(3650), price: z.coerce.number().nonnegative(), is_active: z.boolean() }), req.body); return ok(res, await wrap(supabaseAdmin.from('ad_durations').insert(body).select('*').single()), 201); } catch (error) { next(error); } });
app.put('/api/admin/durations/:id', requireAdmin, async (req, res, next) => { try { const body = parse(z.object({ duration_days: z.coerce.number().int().positive().max(3650).optional(), price: z.coerce.number().nonnegative().optional(), is_active: z.boolean().optional() }), req.body); return ok(res, await wrap(supabaseAdmin.from('ad_durations').update(body).eq('id', validateId(req.params.id)).select('*').single())); } catch (error) { next(error); } });
app.delete('/api/admin/durations/:id', requireAdmin, async (req, res, next) => { try { await wrap(supabaseAdmin.from('ad_durations').delete().eq('id', validateId(req.params.id))); return ok(res, null); } catch (error) { next(error); } });
app.get('/api/admin/payments', requireAdmin, async (req, res, next) => { try { const result = await adminList('payments', req, '*, user:profiles!payments_user_id_fkey(id,username,full_name,email), advertisement:advertisements(id,title,duration_days,amount)'); return ok(res, result.data.map((p) => ({ ...p, amount: money(p.amount) })), 200, result.pagination); } catch (error) { next(error); } });
app.get('/api/admin/payments/stats', requireAdmin, async (req, res, next) => { try { const rows = await wrap(supabaseAdmin.from('payments').select('amount,status')); const status_breakdown = Object.values(rows.reduce((acc, row) => { acc[row.status] ||= { status: row.status, count: 0 }; acc[row.status].count++; return acc; }, {})); return ok(res, { total_revenue: rows.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0), total_transactions: rows.length, status_breakdown }); } catch (error) { next(error); } });
app.get('/api/admin/payments/:id', requireAdmin, async (req, res, next) => { try { return ok(res, await wrap(supabaseAdmin.from('payments').select('*, user:profiles!payments_user_id_fkey(id,username,full_name,email), advertisement:advertisements(id,title,duration_days,amount)').eq('id', validateId(req.params.id)).maybeSingle())); } catch (error) { next(error); } });
app.get('/api/admin/reports', requireAdmin, async (req, res, next) => { try { const result = await adminList('reports', req, '*, reporter:profiles!reports_reporter_id_fkey(id,username,full_name,email), target_user:profiles!reports_target_user_id_fkey(id,username,full_name,email), target_product:products(id,name,price), target_advertisement:advertisements(id,title)'); return ok(res, result.data, 200, result.pagination); } catch (error) { next(error); } });
app.get('/api/admin/reports/:id', requireAdmin, async (req, res, next) => { try { return ok(res, await wrap(supabaseAdmin.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(id,username,full_name,email), target_user:profiles!reports_target_user_id_fkey(id,username,full_name,email), target_product:products(id,name,price), target_advertisement:advertisements(id,title)').eq('id', validateId(req.params.id)).maybeSingle())); } catch (error) { next(error); } });
const resolveReport = (status) => async (req, res, next) => { try { const { admin_notes } = parse(z.object({ admin_notes: z.string().trim().max(2000) }), req.body); return ok(res, await wrap(supabaseAdmin.from('reports').update({ status, admin_notes, resolved_by: req.identity.profile.id, resolved_at: new Date().toISOString() }).eq('id', validateId(req.params.id)).select('*').single())); } catch (error) { next(error); } };
app.patch('/api/admin/reports/:id/resolve', requireAdmin, resolveReport('resolved'));
app.patch('/api/admin/reports/:id/dismiss', requireAdmin, resolveReport('dismissed'));
app.get('/api/admin/contact', requireAdmin, async (req, res, next) => { try { const result = await adminList('contact_messages', req, '*', (q) => req.query.status ? q.eq('status', String(req.query.status)) : q); return ok(res, result.data, 200, result.pagination); } catch (error) { next(error); } });
app.get('/api/admin/contact/:id', requireAdmin, async (req, res, next) => { try { return ok(res, await wrap(supabaseAdmin.from('contact_messages').select('*').eq('id', validateId(req.params.id)).maybeSingle())); } catch (error) { next(error); } });
app.patch('/api/admin/contact/:id/status', requireAdmin, async (req, res, next) => { try { const { status } = parse(z.object({ status: z.enum(['new', 'read', 'replied']) }), req.body); return ok(res, await wrap(supabaseAdmin.from('contact_messages').update({ status, replied_at: status === 'replied' ? new Date().toISOString() : null }).eq('id', validateId(req.params.id)).select('*').single())); } catch (error) { next(error); } });
app.delete('/api/admin/contact/:id', requireAdmin, async (req, res, next) => { try { await wrap(supabaseAdmin.from('contact_messages').delete().eq('id', validateId(req.params.id))); return ok(res, null); } catch (error) { next(error); } });

app.use((req, res) => fail(res, 'Route not found', 404));
app.use((error, req, res, next) => {
  const status = Number(error.status) || 500;
  if (status >= 500) console.error(error.message);
  if (res.headersSent) return next(error);
  return fail(res, status >= 500 ? 'Internal server error' : error.message, status);
});

export default app;