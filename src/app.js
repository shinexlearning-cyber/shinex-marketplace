import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  max: 10,
});

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || [
  process.env.FRONTEND_URL || 'https://shinexmarket.onrender.com',
  process.env.ADMIN_FRONTEND_URL || 'https://shinex-admin.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)),
});

const ok = (res, data, message) => res.json({ success: true, ...(message ? { message } : {}), ...(data === undefined ? {} : { data }) });
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const safeUser = (u) => {
  if (!u) return u;
  const { password_hash, reset_token, reset_token_expires, ...publicUser } = u;
  return publicUser;
};
const clampLimit = (value, fallback = 20) => Math.min(100, Math.max(1, Number(value) || fallback));
const pagination = (q) => ({ page: Math.max(1, Number(q.page) || 1), limit: clampLimit(q.limit) });
const validUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v));
const moneyKobo = (amount) => Math.round(Number(amount) * 100);
const tokenFor = (u) => jwt.sign({ sub: u.id }, process.env.JWT_SECRET, { expiresIn: '7d', issuer: 'shinex-api', audience: 'shinex' });

if (['JWT_SECRET'].some(k => !process.env[k]) && process.env.NODE_ENV !== 'test') {
  console.warn('JWT_SECRET is not configured; authenticated requests will fail until configured.');
}

app.use(helmet());
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); } }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

const cloudinaryConfigured = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].every(k => process.env[k]);
if (cloudinaryConfigured) cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

const uploadFile = (file, folder = 'shinex') => new Promise((resolve, reject) => {
  if (!file) return resolve(null);
  if (!cloudinaryConfigured) return reject(new Error('Cloudinary is required for image uploads'));
  const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => error ? reject(error) : resolve({ url: result.secure_url, public_id: result.public_id }));
  stream.end(file.buffer);
});

async function auth(req, res, next) {
  try {
    const raw = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!raw) return fail(res, 401, 'Authentication required');
    if (!process.env.JWT_SECRET) return fail(res, 500, 'Authentication is not configured');
    const payload = jwt.verify(raw, process.env.JWT_SECRET, { issuer: 'shinex-api', audience: 'shinex' });
    if (!validUuid(payload.sub)) return fail(res, 401, 'Invalid authentication token');
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [payload.sub]);
    if (!rows[0]) return fail(res, 401, 'User not found');
    if (rows[0].is_suspended) return fail(res, 403, 'Account suspended');
    req.user = rows[0];
    next();
  } catch (_e) { return fail(res, 401, 'Invalid or expired token'); }
}
const adminOnly = (req, res, next) => req.user?.is_admin ? next() : fail(res, 403, 'Administrator access required');
const optionalAuth = async (req, _res, next) => {
  try {
    const raw = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (raw && process.env.JWT_SECRET) {
      const payload = jwt.verify(raw, process.env.JWT_SECRET, { issuer: 'shinex-api', audience: 'shinex' });
      if (validUuid(payload.sub)) req.user = (await pool.query('SELECT * FROM users WHERE id=$1', [payload.sub])).rows[0];
    }
  } catch (_) {}
  next();
};

const userSelect = `id,username,email,full_name,phone,bio,location,whatsapp,shop_name,shop_description,avatar_url,is_admin,is_suspended,suspension_reason,is_seller,plan,plan_expires_at,created_at,updated_at`;
const productSelect = `
  p.id,p.user_id,p.name,p.description,p.price,p.category_id,p.condition,p.location,
  p.status AS approval_status,p.status,p.rejection_reason,p.is_sold,p.is_active,p.views AS views_count,p.created_at,p.updated_at,
  COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.is_primary DESC,pi.created_at ASC LIMIT 1),'') AS primary_image,
  COALESCE((SELECT json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,'is_primary',pi.is_primary,'display_order',pi.display_order) ORDER BY pi.is_primary DESC,pi.created_at ASC) FROM product_images pi WHERE pi.product_id=p.id),'[]'::json) AS images,
  json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'email',u.email,'phone',u.phone,'bio',u.bio,'location',u.location,'whatsapp',u.whatsapp,'avatar_url',u.avatar_url,'shop_name',u.shop_name,'shop_description',u.shop_description) AS seller,
  CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object('id',c.id,'name',c.name,'slug',c.slug) END AS category
  FROM products p JOIN users u ON u.id=p.user_id LEFT JOIN categories c ON c.id=p.category_id`;

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); ok(res, undefined, 'SHINEX API is running'); }
  catch { fail(res, 503, 'SHINEX API is running but database is unavailable'); }
});
app.get('/health', (_req, res) => ok(res, undefined, 'SHINEX Marketplace API is running'));

// AUTH
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { email, password, username, full_name, phone, bio, location, whatsapp, shop_name, shop_description } = req.body;
    if (!email || !username || !password || password.length < 8) return fail(res, 400, 'Email, username and an 8-character password are required');
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(`INSERT INTO users(email,username,password_hash,full_name,phone,bio,location,whatsapp,shop_name,shop_description)
      VALUES(lower($1),$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${userSelect}`, [email.trim(), username.trim(), hash, full_name || null, phone || null, bio || null, location || null, whatsapp || null, shop_name || null, shop_description || null]);
    const u = r.rows[0];
    ok(res, { user: u, token: tokenFor(u) }, 'Account created successfully!');
  } catch (e) { if (e.code === '23505') return fail(res, 409, 'Email or username already exists'); next(e); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const r = await pool.query('SELECT * FROM users WHERE lower(email)=lower($1)', [String(req.body.email || '').trim()]);
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) return fail(res, 401, 'Invalid email or password');
    if (u.is_suspended) return fail(res, 403, 'Account suspended');
    await pool.query('UPDATE users SET updated_at=now() WHERE id=$1', [u.id]);
    ok(res, { user: safeUser(u), token: tokenFor(u) }, 'Login successful!');
  } catch (e) { next(e); }
});
app.get('/api/auth/me', auth, (req, res) => ok(res, { user: safeUser(req.user) }));
app.post('/api/auth/logout', auth, (_req, res) => ok(res, undefined, 'Logged out successfully'));
app.post('/api/auth/forgot-password', async (req, res, next) => {
  try {
    const r = await pool.query('SELECT id,email FROM users WHERE lower(email)=lower($1)', [String(req.body.email || '').trim()]);
    if (r.rows[0]) {
      const raw = crypto.randomBytes(32).toString('hex');
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [r.rows[0].id]);
      await pool.query("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')", [crypto.createHash('sha256').update(raw).digest('hex'), r.rows[0].id]);
      // If an email provider is configured, send the link. Never expose the raw token in production responses.
      if (process.env.RESET_URL_BASE) console.log(`Password reset URL generated for ${r.rows[0].email}: ${process.env.RESET_URL_BASE}?token=${raw}`);
    }
    ok(res, undefined, 'If an account exists with this email, you will receive password reset instructions.');
  } catch (e) { next(e); }
});
app.post('/api/auth/reset-password', async (req, res, next) => {
  try {
    const raw = String(req.body.token || '');
    const password = String(req.body.new_password || '');
    if (password.length < 8 || !raw) return fail(res, 400, 'Invalid or expired reset token');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query('SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE', [hash]);
      if (!r.rows[0]) { await client.query('ROLLBACK'); return fail(res, 400, 'Invalid or expired reset token'); }
      await client.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2', [await bcrypt.hash(password, 12), r.rows[0].user_id]);
      await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE token_hash=$1', [hash]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
    ok(res, undefined, 'Password reset successfully');
  } catch (e) { next(e); }
});

// USERS
app.get('/api/users/me', auth, (req, res) => ok(res, { user: safeUser(req.user) }));
app.put('/api/users/me', auth, async (req, res, next) => {
  try {
    const fields = ['full_name','phone','bio','location','whatsapp','shop_name','shop_description','username'];
    let set = fields.filter(k => req.body[k] !== undefined);
    if (!set.length) return ok(res, { user: safeUser(req.user) });
    if ((req.body.shop_name !== undefined || req.body.shop_description !== undefined) && !set.includes('is_seller')) set.push('is_seller');
    const values = set.map(k => k === 'is_seller' ? Boolean(req.body.shop_name || req.body.shop_description || req.user.is_seller) : req.body[k]);
    const r = await pool.query(`UPDATE users SET ${set.map((k,i)=>`${k}=$${i+1}`).join(',')},updated_at=now() WHERE id=$${set.length+1} RETURNING ${userSelect}`, [...values, req.user.id]);
    ok(res, { user: r.rows[0] }, 'Profile updated successfully');
  } catch (e) { if (e.code === '23505') return fail(res, 409, 'Username already exists'); next(e); }
});
app.post('/api/users/me/avatar', auth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 400, 'Image is required');
    const image = await uploadFile(req.file, 'shinex/avatars');
    const r = await pool.query('UPDATE users SET avatar_url=$1,updated_at=now() WHERE id=$2 RETURNING *', [image.url, req.user.id]);
    ok(res, { user: safeUser(r.rows[0]) }, 'Profile picture updated successfully');
  } catch (e) { next(e); }
});
app.get('/api/users/:username/shop', async (req, res, next) => {
  try {
    const { page: pg, limit } = pagination(req.query);
    const user = (await pool.query(`SELECT ${userSelect} FROM users WHERE username=$1`, [req.params.username])).rows[0];
    if (!user) return fail(res, 404, 'Seller not found');
    const count = await pool.query('SELECT count(*) FROM products WHERE user_id=$1 AND is_active=true', [user.id]);
    const products = await pool.query(`${productSelect} WHERE p.user_id=$1 AND p.is_active=true AND p.status='approved' ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`, [user.id, limit, (pg-1)*limit]);
    ok(res, { shop: { shop_name:user.shop_name, shop_description:user.shop_description, username:user.username, full_name:user.full_name, avatar_url:user.avatar_url, bio:user.bio, location:user.location, whatsapp:user.whatsapp, product_count:Number(count.rows[0].count) }, products:products.rows, pagination:{page:pg,limit,total:Number(count.rows[0].count),totalPages:Math.ceil(Number(count.rows[0].count)/limit)} });
  } catch (e) { next(e); }
});
app.get('/api/users/:username', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT ${userSelect}, (SELECT count(*) FROM products p WHERE p.user_id=users.id AND p.is_active=true AND p.status='approved') AS product_count FROM users WHERE username=$1`, [req.params.username]);
    if (!r.rows[0]) return fail(res, 404, 'Seller not found');
    const u = r.rows[0];
    ok(res, { user: { id:u.id,username:u.username,full_name:u.full_name,avatar_url:u.avatar_url,bio:u.bio,location:u.location,whatsapp:u.whatsapp,created_at:u.created_at }, shop:{ shop_name:u.shop_name,shop_description:u.shop_description,product_count:Number(u.product_count),username:u.username,profile_picture:u.avatar_url,bio:u.bio,location:u.location,whatsapp:u.whatsapp } });
  } catch (e) { next(e); }
});

// PRODUCTS
app.get('/api/products/categories/all', async (_req,res,next) => { try { ok(res,(await pool.query('SELECT * FROM categories WHERE is_active=true ORDER BY name')).rows); } catch(e){next(e);} });
app.get('/api/products', optionalAuth, async (req,res,next) => {
  try {
    const {page:pg,limit}=pagination(req.query); const vals=[]; const where=["p.is_active=true","p.status='approved'"];
    const add=(v)=>{vals.push(v);return `$${vals.length}`;};
    if(req.query.search){const x=add(`%${String(req.query.search)}%`);where.push(`(p.name ILIKE ${x} OR p.description ILIKE ${x})`);}
    const category=req.query.category_id||req.query.category; if(category){const x=add(category);where.push(`p.category_id=${x}`);}
    if(req.query.min_price!==undefined){const x=add(Number(req.query.min_price));where.push(`p.price>=${x}`);}
    if(req.query.max_price!==undefined){const x=add(Number(req.query.max_price));where.push(`p.price<=${x}`);}
    let order='p.created_at DESC'; if(req.query.sort==='price_asc') order='p.price ASC'; if(req.query.sort==='price_desc') order='p.price DESC';
    const count=await pool.query(`SELECT count(*) FROM products p WHERE ${where.join(' AND ')}`,vals);
    vals.push(limit,(pg-1)*limit);
    const rows=await pool.query(`${productSelect} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);
    const total=Number(count.rows[0].count); res.json({success:true,data:rows.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});
  } catch(e){next(e);}
});
app.get('/api/products/mine/all', auth, async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const vals=[req.user.id];let where='p.user_id=$1';if(req.query.status){vals.push(req.query.status);where+=` AND p.status=$${vals.length}`;}const r=await pool.query(`${productSelect} WHERE ${where} ORDER BY p.created_at DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`,[...vals,limit,(pg-1)*limit]);const c=await pool.query(`SELECT count(*) FROM products p WHERE ${where}`,vals);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/products/:id', async(req,res,next)=>{try{if(!validUuid(req.params.id))return fail(res,404,'Product not found');const r=await pool.query(`${productSelect} WHERE p.id=$1`,[req.params.id]);if(!r.rows[0])return fail(res,404,'Product not found');await pool.query('UPDATE products SET views=views+1 WHERE id=$1',[req.params.id]);r.rows[0].views_count=Number(r.rows[0].views_count)+1;ok(res,r.rows[0]);}catch(e){next(e);}});
async function createProduct(req,res,next){try{const b=req.body;if(!b.name||!Number.isFinite(Number(b.price))||Number(b.price)<0||!b.category_id)return fail(res,400,'Name, valid price and category are required');if(!validUuid(b.category_id))return fail(res,400,'Invalid category');const c=await pool.query('SELECT id FROM categories WHERE id=$1 AND is_active=true',[b.category_id]);if(!c.rows[0])return fail(res,400,'Invalid category');const sub=await pool.query("SELECT sp.listing_limit FROM subscriptions s JOIN subscription_plans sp ON sp.id=s.plan WHERE s.user_id=$1 AND s.payment_status IN ('paid','success') AND (s.plan_expires_at IS NULL OR s.plan_expires_at>now()) ORDER BY sp.listing_limit DESC LIMIT 1",[req.user.id]);const limit=Number(sub.rows[0]?.listing_limit||10);const count=await pool.query('SELECT count(*) FROM products WHERE user_id=$1 AND is_active=true',[req.user.id]);if(Number(count.rows[0].count)>=limit)return fail(res,403,'Listing limit reached for your subscription');const r=await pool.query('INSERT INTO products(user_id,name,price,category_id,description,condition,location,status) VALUES($1,$2,$3,$4,$5,$6,$7,\'pending\') RETURNING *',[req.user.id,b.name,Number(b.price),b.category_id,b.description||null,b.condition||null,b.location||null]);for(const [i,f] of (req.files||[]).entries()){const image=await uploadFile(f,'shinex/products');await pool.query('INSERT INTO product_images(product_id,image_url,is_primary,display_order) VALUES($1,$2,$3,$4)',[r.rows[0].id,image.url,i===0,i]);}ok(res,{product:(await pool.query(`${productSelect} WHERE p.id=$1`,[r.rows[0].id])).rows[0]},'Product created successfully');}catch(e){next(e);}}
app.post('/api/products',auth,upload.array('images',5),createProduct);
app.put('/api/products/:id',auth,upload.array('images',5),async(req,res,next)=>{try{if(!validUuid(req.params.id))return fail(res,404,'Product not found');const own=await pool.query('SELECT * FROM products WHERE id=$1 AND (user_id=$2 OR $3=true)',[req.params.id,req.user.id,req.user.is_admin]);if(!own.rows[0])return fail(res,404,'Product not found');const keys=['name','price','category_id','description','condition','location'];const set=keys.filter(k=>req.body[k]!==undefined);if(req.body.category_id){const c=await pool.query('SELECT id FROM categories WHERE id=$1 AND is_active=true',[req.body.category_id]);if(!c.rows[0])return fail(res,400,'Invalid category');}const vals=set.map(k=>k==='price'?Number(req.body[k]):req.body[k]);if(set.length)await pool.query(`UPDATE products SET ${set.map((k,i)=>`${k}=$${i+1}`).join(',')},updated_at=now(),status=CASE WHEN user_id=$${set.length+1} THEN 'pending' ELSE status END WHERE id=$${set.length+2}`,[...vals,req.user.id,req.params.id]);if(req.files?.length){await pool.query('DELETE FROM product_images WHERE product_id=$1',[req.params.id]);for(const [i,f] of req.files.entries()){const image=await uploadFile(f,'shinex/products');await pool.query('INSERT INTO product_images(product_id,image_url,is_primary,display_order) VALUES($1,$2,$3,$4)',[req.params.id,image.url,i===0,i]);}}ok(res,{product:(await pool.query(`${productSelect} WHERE p.id=$1`,[req.params.id])).rows[0]},'Product updated successfully');}catch(e){next(e);}});
app.delete('/api/products/:id',auth,async(req,res,next)=>{try{const r=await pool.query('DELETE FROM products WHERE id=$1 AND (user_id=$2 OR $3=true) RETURNING id',[req.params.id,req.user.id,req.user.is_admin]);if(!r.rows[0])return fail(res,404,'Product not found');ok(res,undefined,'Product deleted successfully');}catch(e){next(e);}});
app.patch('/api/products/:id/sold',auth,async(req,res,next)=>{try{const r=await pool.query('UPDATE products SET is_sold=$1,updated_at=now() WHERE id=$2 AND (user_id=$3 OR $4=true) RETURNING *',[!!req.body.is_sold,req.params.id,req.user.id,req.user.is_admin]);if(!r.rows[0])return fail(res,404,'Product not found');ok(res,r.rows[0]);}catch(e){next(e);}});

// FAVORITES
app.get('/api/favorites/products',auth,async(req,res,next)=>{try{ok(res,(await pool.query(`SELECT f.*,json_build_object('id',p.id,'name',p.name,'price',p.price,'primary_image',COALESCE((SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC,created_at ASC LIMIT 1),'')) AS product FROM favorite_products f JOIN products p ON p.id=f.product_id WHERE f.user_id=$1 ORDER BY f.created_at DESC LIMIT $2`,[req.user.id,clampLimit(req.query.limit,50)])).rows);}catch(e){next(e);}});
app.get('/api/favorites/sellers',auth,async(req,res,next)=>{try{ok(res,(await pool.query(`SELECT f.*,json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'avatar_url',u.avatar_url) AS seller FROM favorite_sellers f JOIN users u ON u.id=f.seller_id WHERE f.user_id=$1 ORDER BY f.created_at DESC LIMIT $2`,[req.user.id,clampLimit(req.query.limit,50)])).rows);}catch(e){next(e);}});
app.post('/api/favorites/product/:productId',auth,async(req,res,next)=>{try{if(!validUuid(req.params.productId))return fail(res,400,'Invalid product');await pool.query('INSERT INTO favorite_products(user_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,req.params.productId]);ok(res,undefined,'Added to favorites');}catch(e){next(e);}});
app.delete('/api/favorites/product/:productId',auth,async(req,res,next)=>{try{await pool.query('DELETE FROM favorite_products WHERE user_id=$1 AND product_id=$2',[req.user.id,req.params.productId]);ok(res,undefined,'Removed from favorites');}catch(e){next(e);}});
app.get('/api/favorites/product/:productId/check',auth,async(req,res,next)=>{try{const r=await pool.query('SELECT 1 FROM favorite_products WHERE user_id=$1 AND product_id=$2',[req.user.id,req.params.productId]);ok(res,{is_favorited:!!r.rows[0]});}catch(e){next(e);}});
app.post('/api/favorites/seller/:sellerId',auth,async(req,res,next)=>{try{if(req.user.id===req.params.sellerId)return fail(res,400,'You cannot favorite yourself');await pool.query('INSERT INTO favorite_sellers(user_id,seller_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,req.params.sellerId]);ok(res,undefined,'Seller added to favorites');}catch(e){next(e);}});
app.delete('/api/favorites/seller/:sellerId',auth,async(req,res,next)=>{try{await pool.query('DELETE FROM favorite_sellers WHERE user_id=$1 AND seller_id=$2',[req.user.id,req.params.sellerId]);ok(res,undefined,'Seller removed from favorites');}catch(e){next(e);}});
app.get('/api/favorites/seller/:sellerId/check',auth,async(req,res,next)=>{try{const r=await pool.query('SELECT 1 FROM favorite_sellers WHERE user_id=$1 AND seller_id=$2',[req.user.id,req.params.sellerId]);ok(res,{is_favorited:!!r.rows[0]});}catch(e){next(e);}});

// ADVERTISEMENTS + PAYSTACK
app.get('/api/advertisements/pricing',async(_req,res,next)=>{try{ok(res,(await pool.query('SELECT * FROM advertisement_durations WHERE is_active=true ORDER BY duration_days')).rows);}catch(e){next(e);}});
app.get('/api/advertisements/my',auth,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const c=await pool.query('SELECT count(*) FROM advertisements WHERE user_id=$1',[req.user.id]);const r=await pool.query(`SELECT a.*,d.duration_days,p.reference AS paystack_reference,p.status AS payment_record_status FROM advertisements a LEFT JOIN advertisement_durations d ON d.id=a.duration_id LEFT JOIN LATERAL (SELECT reference,status FROM payments WHERE advertisement_id=a.id ORDER BY created_at DESC LIMIT 1) p ON true WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,[req.user.id,limit,(pg-1)*limit]);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.post('/api/advertisements',auth,upload.single('image'),async(req,res,next)=>{try{if(!req.body.title||!req.body.duration_id)return fail(res,400,'Title and duration are required');const d=await pool.query('SELECT * FROM advertisement_durations WHERE id=$1 AND is_active=true',[req.body.duration_id]);if(!d.rows[0])return fail(res,400,'Invalid duration');const image=req.file?await uploadFile(req.file,'shinex/advertisements'):null;const r=await pool.query('INSERT INTO advertisements(user_id,title,description,duration_id,image_url,amount) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[req.user.id,req.body.title,req.body.description||null,req.body.duration_id,image?.url||null,d.rows[0].price]);ok(res,{advertisement:r.rows[0],payment_url:null},'Advertisement created successfully');}catch(e){next(e);}});
async function initializePaystack(email, amount, reference, callback_url){if(!process.env.PAYSTACK_SECRET_KEY)throw new Error('PAYSTACK_SECRET_KEY is not configured');const p=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({email,amount:moneyKobo(amount),reference,callback_url})});const j=await p.json();if(!p.ok||!j.status||!j.data?.authorization_url)throw new Error(j.message||'Paystack initialization failed');return j.data;}
app.post('/api/advertisements/:id/pay',auth,async(req,res,next)=>{try{const a=(await pool.query('SELECT a.*,d.duration_days FROM advertisements a LEFT JOIN advertisement_durations d ON d.id=a.duration_id WHERE a.id=$1 AND a.user_id=$2',[req.params.id,req.user.id])).rows[0];if(!a)return fail(res,404,'Advertisement not found');if(a.payment_status==='paid')return fail(res,409,'Advertisement is already paid');const reference=`SHINEX-AD-${a.id}-${Date.now()}`;await pool.query('INSERT INTO payments(user_id,advertisement_id,reference,amount,status) VALUES($1,$2,$3,$4,\'pending\')',[req.user.id,a.id,reference,a.amount]);const data=await initializePaystack(req.user.email,a.amount,reference,`${process.env.FRONTEND_URL||'https://shinexmarket.onrender.com'}/advertise`);ok(res,{authorization_url:data.authorization_url,reference},'Payment initialized successfully');}catch(e){next(e);}});
app.get('/api/advertisements/:id/payment',auth,async(req,res,next)=>{try{const a=(await pool.query(`SELECT a.*,d.duration_days FROM advertisements a LEFT JOIN advertisement_durations d ON d.id=a.duration_id WHERE a.id=$1 AND a.user_id=$2`,[req.params.id,req.user.id])).rows[0];if(!a)return fail(res,404,'Advertisement not found');const p=(await pool.query('SELECT id,amount,status,reference AS paystack_reference,paid_at FROM payments WHERE advertisement_id=$1 ORDER BY created_at DESC LIMIT 1',[a.id])).rows[0]||null;ok(res,{advertisement:a,payment:p});}catch(e){next(e);}});
app.get('/api/advertisements/payment/callback',async(req,res)=>{const reference=req.query.reference||req.query.trxref;const base=process.env.FRONTEND_URL||'https://shinexmarket.onrender.com';res.redirect(`${base}/advertise?payment=success&reference=${encodeURIComponent(reference||'')}`);});
app.post('/api/advertisements/webhook/paystack',async(req,res,next)=>{try{const signature=req.headers['x-paystack-signature'];if(!signature||!process.env.PAYSTACK_SECRET_KEY)return res.status(401).json({message:'Unauthorized'});const raw=req.rawBody||Buffer.from(JSON.stringify(req.body));const expected=crypto.createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');if(String(signature).length!==expected.length || !crypto.timingSafeEqual(Buffer.from(String(signature)),Buffer.from(expected)))return res.status(401).json({message:'Invalid signature'});if(req.body.event==='charge.success'){const ref=req.body.data?.reference;const client=await pool.connect();try{await client.query('BEGIN');const p=(await client.query('SELECT * FROM payments WHERE reference=$1 FOR UPDATE',[ref])).rows[0];if(p){await client.query("UPDATE payments SET status='success',paid_at=COALESCE(paid_at,now()) WHERE id=$1",[p.id]);if(p.advertisement_id)await client.query("UPDATE advertisements SET payment_status='paid' WHERE id=$1",[p.advertisement_id]);if(p.subscription_id){const sr=(await client.query('SELECT user_id,plan FROM subscriptions WHERE id=$1',[p.subscription_id])).rows[0];await client.query("UPDATE subscriptions SET payment_status='paid',plan_expires_at=COALESCE(plan_expires_at,now()+interval '30 days') WHERE id=$1",[p.subscription_id]);if(sr)await client.query("UPDATE users SET plan=$1,plan_expires_at=(SELECT plan_expires_at FROM subscriptions WHERE id=$2),updated_at=now() WHERE id=$3",[sr.plan,p.subscription_id,sr.user_id]);}}await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}res.json({message:'Webhook processed successfully'});}catch(e){next(e);}});

// SUBSCRIPTIONS (kept for frontend compatibility)
app.get('/api/subscriptions/plans',async(_req,res,next)=>{try{const rows=await pool.query('SELECT * FROM subscription_plans ORDER BY amount');ok(res,Object.fromEntries(rows.rows.map(x=>[x.id,{amount:Number(x.amount),label:x.label,listing_limit:x.listing_limit}])));}catch(e){next(e);}});
app.get('/api/subscriptions/me',auth,async(req,res,next)=>{try{const r=await pool.query('SELECT plan,plan_expires_at,payment_status FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',[req.user.id]);ok(res,r.rows[0]||{plan:'basic',plan_expires_at:null,payment_status:'active'});}catch(e){next(e);}});
app.post('/api/subscriptions',auth,async(req,res,next)=>{try{const p=(await pool.query('SELECT * FROM subscription_plans WHERE id=$1',[req.body.plan])).rows[0];if(!p)return fail(res,400,'Invalid plan');if(Number(p.amount)===0){const s=(await pool.query("INSERT INTO subscriptions(user_id,plan,payment_status,plan_expires_at) VALUES($1,$2,'paid',now()+interval '30 days') RETURNING *",[req.user.id,req.body.plan])).rows[0];await pool.query("UPDATE users SET plan=$1,plan_expires_at=$2,updated_at=now() WHERE id=$3",[s.plan,s.plan_expires_at,req.user.id]);return ok(res,{subscription:s,authorization_url:null,reference:null},'Subscription activated successfully');}const s=(await pool.query("INSERT INTO subscriptions(user_id,plan,payment_status) VALUES($1,$2,'pending') RETURNING *",[req.user.id,req.body.plan])).rows[0];const reference=`SHINEX-SUB-${s.id}-${Date.now()}`;await pool.query('INSERT INTO payments(user_id,subscription_id,reference,amount,status) VALUES($1,$2,$3,$4,\'pending\')',[req.user.id,s.id,reference,p.amount]);const data=await initializePaystack(req.user.email,p.amount,reference,`${process.env.FRONTEND_URL||'https://shinexmarket.onrender.com'}/subscriptions`);ok(res,{subscription:s,authorization_url:data.authorization_url,reference},'Subscription payment initialized successfully');}catch(e){next(e);}});
app.get('/api/subscriptions/verify/:reference',auth,async(req,res,next)=>{try{const p=(await pool.query('SELECT * FROM payments WHERE reference=$1 AND user_id=$2',[req.params.reference,req.user.id])).rows[0];if(!p)return fail(res,404,'Payment not found');if(!process.env.PAYSTACK_SECRET_KEY)return fail(res,503,'Payment provider is not configured');const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(req.params.reference)}`,{headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`}});const j=await response.json();if(!response.ok||j.data?.status!=='success'){await pool.query("UPDATE payments SET status='failed' WHERE id=$1 AND status='pending'",[p.id]);return fail(res,400,'Payment verification failed');}const client=await pool.connect();try{await client.query('BEGIN');await client.query("UPDATE payments SET status='success',paid_at=COALESCE(paid_at,now()) WHERE id=$1",[p.id]);if(p.subscription_id){const s=(await client.query('SELECT * FROM subscriptions WHERE id=$1 FOR UPDATE',[p.subscription_id])).rows[0];const days=s?.plan==='pro'?30:30;await client.query("UPDATE subscriptions SET payment_status='paid',plan_expires_at=now()+($1 * interval '1 day') WHERE id=$2",[days,p.subscription_id]);await client.query("UPDATE users SET plan=(SELECT plan FROM subscriptions WHERE id=$1),plan_expires_at=now()+($2 * interval '1 day'),updated_at=now() WHERE id=$3",[p.subscription_id,days,p.user_id]);}if(p.advertisement_id){const a=(await client.query('SELECT d.duration_days FROM advertisements a JOIN advertisement_durations d ON d.id=a.duration_id WHERE a.id=$1',[p.advertisement_id])).rows[0];await client.query("UPDATE advertisements SET payment_status='paid',expires_at=now()+($1 * interval '1 day') WHERE id=$2",[a?.duration_days||7,p.advertisement_id]);}await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}ok(res,(await pool.query('SELECT * FROM payments WHERE id=$1',[p.id])).rows[0]);}catch(e){next(e);}});

// REPORTS / CONTACT / ACTIVITY
app.post('/api/reports',auth,async(req,res,next)=>{try{const b=req.body;if(!b.reason)return fail(res,400,'Reason is required');const targets=[['products','target_product_id'],['users','target_user_id'],['advertisements','target_advertisement_id']].filter(([,k])=>b[k]);if(targets.length!==1)return fail(res,400,'Exactly one report target is required');const [table,key]=targets[0];const found=await pool.query(`SELECT id FROM ${table} WHERE id=$1`,[b[key]]);if(!found.rows[0])return fail(res,400,'Report target does not exist');const r=await pool.query('INSERT INTO reports(reporter_id,target_product_id,target_user_id,target_advertisement_id,reason,description,status) VALUES($1,$2,$3,$4,$5,$6,\'pending\') RETURNING *',[req.user.id,b.target_product_id||null,b.target_user_id||null,b.target_advertisement_id||null,b.reason,b.description||null]);ok(res,r.rows[0],'Report submitted successfully');}catch(e){next(e);}});
app.get('/api/reports/my',auth,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const c=await pool.query('SELECT count(*) FROM reports WHERE reporter_id=$1',[req.user.id]);const r=await pool.query(`SELECT r.*,CASE WHEN p.id IS NOT NULL THEN json_build_object('id',p.id,'name',p.name,'price',p.price) END AS target_product,CASE WHEN u.id IS NOT NULL THEN json_build_object('id',u.id,'username',u.username) END AS target_user,CASE WHEN a.id IS NOT NULL THEN json_build_object('id',a.id,'title',a.title) END AS target_advertisement FROM reports r LEFT JOIN products p ON p.id=r.target_product_id LEFT JOIN users u ON u.id=r.target_user_id LEFT JOIN advertisements a ON a.id=r.target_advertisement_id WHERE r.reporter_id=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,[req.user.id,limit,(pg-1)*limit]);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/contact/info',(_req,res)=>ok(res,{email:process.env.CONTACT_EMAIL||'',phone:process.env.CONTACT_PHONE||'',whatsapp:process.env.CONTACT_WHATSAPP||'',address:process.env.CONTACT_ADDRESS||''}));
app.post('/api/contact',async(req,res,next)=>{try{if(!req.body.name||!req.body.email||!req.body.message)return fail(res,400,'Name, email and message are required');const r=await pool.query('INSERT INTO contact_messages(name,email,phone,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING *',[req.body.name,req.body.email,req.body.phone||null,req.body.subject||null,req.body.message]);ok(res,r.rows[0],'Your message has been sent successfully!');}catch(e){next(e);}});
app.get('/api/activity',auth,async(req,res,next)=>{try{ok(res,(await pool.query('SELECT * FROM activities WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2',[req.user.id,clampLimit(req.query.limit,50)])).rows);}catch(e){next(e);}});

// ADMIN HELPERS
const adminList = async (req,res,next,route,table,searchFields=[],joins='')=>{try{const {page:pg,limit}=pagination(req.query);const vals=[];let where=[];if(req.query.search&&searchFields.length){vals.push(`%${req.query.search}%`);where.push(`(${searchFields.map(f=>`${f} ILIKE $1`).join(' OR ')})`);}if(req.query.status&&route!=='categories'&&route!=='durations'){vals.push(req.query.status);where.push(`${table}.status=$${vals.length}`);}const whereSql=where.length?`WHERE ${where.join(' AND ')}`:'';const c=await pool.query(`SELECT count(*) FROM ${table} ${whereSql}`,vals);vals.push(limit,(pg-1)*limit);const order=route==='durations'?'duration_days':'created_at';const r=await pool.query(`SELECT ${table}.* ${joins} FROM ${table} ${whereSql} ORDER BY ${table}.${order} DESC NULLS LAST LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);const total=Number(c.rows[0].count);return res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}};

app.get('/api/admin/users',auth,adminOnly,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const vals=[];const where=[];if(req.query.search){vals.push(`%${req.query.search}%`);where.push('(u.email ILIKE $1 OR u.username ILIKE $1 OR u.full_name ILIKE $1)');}if(req.query.status==='suspended')where.push('u.is_suspended=true');if(req.query.status==='active')where.push('u.is_suspended=false');const ws=where.length?`WHERE ${where.join(' AND ')}`:'';const c=await pool.query(`SELECT count(*) FROM users u ${ws}`,vals);vals.push(limit,(pg-1)*limit);const r=await pool.query(`SELECT ${userSelect},(SELECT count(*) FROM products p WHERE p.user_id=u.id) AS product_count,(SELECT count(*) FROM advertisements a WHERE a.user_id=u.id) AS advertisement_count,(SELECT count(*) FROM reports rp WHERE rp.reporter_id=u.id) AS report_count FROM users u ${ws} ORDER BY u.created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);const data=r.rows.map(u=>{const {product_count,advertisement_count,report_count,...user}=u;return {...user,stats:{products:Number(product_count),advertisements:Number(advertisement_count),reports:Number(report_count)}};});const total=Number(c.rows[0].count);res.json({success:true,data,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/admin/users/:id',auth,adminOnly,async(req,res,next)=>{try{const u=(await pool.query(`SELECT ${userSelect} FROM users WHERE id=$1`,[req.params.id])).rows[0];if(!u)return fail(res,404,'User not found');const stats=await pool.query(`SELECT (SELECT count(*) FROM products WHERE user_id=$1) products,(SELECT count(*) FROM advertisements WHERE user_id=$1) advertisements,(SELECT count(*) FROM reports WHERE reporter_id=$1) reports`,[u.id]);ok(res,{...u,stats:stats.rows[0]});}catch(e){next(e);}});
app.patch('/api/admin/users/:id/suspend',auth,adminOnly,async(req,res,next)=>{try{if(req.params.id===req.user.id)return fail(res,409,'You cannot suspend yourself');const r=await pool.query('UPDATE users SET is_suspended=true,suspension_reason=$1,updated_at=now() WHERE id=$2 RETURNING *',[req.body.reason||'Suspended by administrator',req.params.id]);if(!r.rows[0])return fail(res,404,'User not found');ok(res,safeUser(r.rows[0]),'User suspended successfully');}catch(e){next(e);}});
app.patch('/api/admin/users/:id/unsuspend',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('UPDATE users SET is_suspended=false,suspension_reason=null,updated_at=now() WHERE id=$1 RETURNING *',[req.params.id]);if(!r.rows[0])return fail(res,404,'User not found');ok(res,safeUser(r.rows[0]),'User unsuspended successfully');}catch(e){next(e);}});
app.patch('/api/admin/users/:id/set-admin',auth,adminOnly,async(req,res,next)=>{try{const desired=req.body.is_admin;if(typeof desired!=='boolean')return fail(res,400,'is_admin must be boolean');if(req.params.id===req.user.id&&!desired)return fail(res,409,'You cannot remove your own administrator access');if(!desired){const n=await pool.query('SELECT count(*) FROM users WHERE is_admin=true AND is_suspended=false');if(Number(n.rows[0].count)<=1)return fail(res,409,'Cannot remove the final administrator');}const r=await pool.query('UPDATE users SET is_admin=$1,updated_at=now() WHERE id=$2 RETURNING *',[desired,req.params.id]);if(!r.rows[0])return fail(res,404,'User not found');ok(res,safeUser(r.rows[0]),'Administrator status updated');}catch(e){next(e);}});
app.delete('/api/admin/users/:id',auth,adminOnly,async(req,res,next)=>{try{if(req.params.id===req.user.id)return fail(res,409,'You cannot delete yourself');const r=await pool.query('DELETE FROM users WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return fail(res,404,'User not found');ok(res,undefined,'User deleted successfully');}catch(e){next(e);}});

app.get('/api/admin/products',auth,adminOnly,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const vals=[];const where=[];if(req.query.search){vals.push(`%${req.query.search}%`);where.push('(p.name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)');}if(req.query.status){vals.push(req.query.status);where.push(`p.status=$${vals.length}`);}const ws=where.length?`WHERE ${where.join(' AND ')}`:'';const c=await pool.query(`SELECT count(*) FROM products p JOIN users u ON u.id=p.user_id ${ws}`,vals);vals.push(limit,(pg-1)*limit);const r=await pool.query(`SELECT p.*,p.status AS approval_status,json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'email',u.email,'phone',u.phone) AS "user",json_build_object('id',c.id,'name',c.name,'slug',c.slug) AS category,COALESCE((SELECT json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,'is_primary',pi.is_primary,'display_order',pi.display_order) ORDER BY pi.is_primary DESC,pi.created_at ASC) FROM product_images pi WHERE pi.product_id=p.id),'[]'::json) AS images,COALESCE((SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC,created_at ASC LIMIT 1),'') AS primary_image FROM products p JOIN users u ON u.id=p.user_id LEFT JOIN categories c ON c.id=p.category_id ${ws} ORDER BY p.created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/admin/products/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query(`SELECT p.*,p.status AS approval_status,json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'email',u.email,'phone',u.phone) AS "user",json_build_object('id',c.id,'name',c.name,'slug',c.slug) AS category,COALESCE((SELECT json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,'is_primary',pi.is_primary,'display_order',pi.display_order) ORDER BY pi.is_primary DESC,pi.created_at ASC) FROM product_images pi WHERE pi.product_id=p.id),'[]'::json) AS images FROM products p JOIN users u ON u.id=p.user_id LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=$1`,[req.params.id]);if(!r.rows[0])return fail(res,404,'Product not found');ok(res,r.rows[0]);}catch(e){next(e);}});
app.patch('/api/admin/products/:id/approve',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query("UPDATE products SET status='approved',rejection_reason=null,updated_at=now() WHERE id=$1 RETURNING *",[req.params.id]);if(!r.rows[0])return fail(res,404,'Product not found');ok(res,r.rows[0],'Product approved successfully');}catch(e){next(e);}});
app.patch('/api/admin/products/:id/reject',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query("UPDATE products SET status='rejected',rejection_reason=$1,updated_at=now() WHERE id=$2 RETURNING *",[req.body.reason||'Rejected by administrator',req.params.id]);if(!r.rows[0])return fail(res,404,'Product not found');ok(res,r.rows[0],'Product rejected');}catch(e){next(e);}});
app.delete('/api/admin/products/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('DELETE FROM products WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return fail(res,404,'Product not found');ok(res,undefined,'Product deleted successfully');}catch(e){next(e);}});

app.get('/api/admin/categories',auth,adminOnly,async(req,res,next)=>{try{ok(res,(await pool.query('SELECT * FROM categories ORDER BY name')).rows);}catch(e){next(e);}});
app.post('/api/admin/categories',auth,adminOnly,async(req,res,next)=>{try{if(!req.body.name)return fail(res,400,'Category name is required');const slug=(req.body.slug||req.body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const r=await pool.query('INSERT INTO categories(name,slug,description,icon,is_active) VALUES($1,$2,$3,$4,$5) RETURNING *',[req.body.name,slug,req.body.description||null,req.body.icon||null,req.body.is_active!==false]);ok(res,r.rows[0],'Category created successfully');}catch(e){if(e.code==='23505')return fail(res,409,'Category slug already exists');next(e);}});
app.put('/api/admin/categories/:id',auth,adminOnly,async(req,res,next)=>{try{const slug=req.body.slug??(req.body.name?req.body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''):undefined);const r=await pool.query('UPDATE categories SET name=COALESCE($1,name),slug=COALESCE($2,slug),description=COALESCE($3,description),icon=COALESCE($4,icon),is_active=COALESCE($5,is_active) WHERE id=$6 RETURNING *',[req.body.name,slug,req.body.description,req.body.icon,req.body.is_active,req.params.id]);if(!r.rows[0])return fail(res,404,'Category not found');ok(res,r.rows[0],'Category updated successfully');}catch(e){if(e.code==='23505')return fail(res,409,'Category slug already exists');next(e);}});
app.delete('/api/admin/categories/:id',auth,adminOnly,async(req,res,next)=>{try{const used=await pool.query('SELECT 1 FROM products WHERE category_id=$1 LIMIT 1',[req.params.id]);if(used.rows[0])return fail(res,409,'Category is used by existing listings');const r=await pool.query('DELETE FROM categories WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return fail(res,404,'Category not found');ok(res,undefined,'Category deleted successfully');}catch(e){next(e);}});

app.get('/api/admin/advertisements',auth,adminOnly,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const vals=[];const where=[];if(req.query.search){vals.push(`%${req.query.search}%`);where.push('(a.title ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)');}if(req.query.approval){vals.push(req.query.approval);where.push(`a.approval_status=$${vals.length}`);}if(req.query.payment){vals.push(req.query.payment);where.push(`a.payment_status=$${vals.length}`);}const ws=where.length?`WHERE ${where.join(' AND ')}`:'';const c=await pool.query(`SELECT count(*) FROM advertisements a JOIN users u ON u.id=a.user_id ${ws}`,vals);vals.push(limit,(pg-1)*limit);const r=await pool.query(`SELECT a.*,d.duration_days,d.price AS duration_price,CASE WHEN d.id IS NULL THEN NULL ELSE json_build_object('id',d.id,'duration_days',d.duration_days,'price',d.price) END AS duration,json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'email',u.email) AS "user" FROM advertisements a JOIN users u ON u.id=a.user_id LEFT JOIN advertisement_durations d ON d.id=a.duration_id ${ws} ORDER BY a.created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/admin/advertisements/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query(`SELECT a.*,d.duration_days,d.price AS duration_price,CASE WHEN d.id IS NULL THEN NULL ELSE json_build_object('id',d.id,'duration_days',d.duration_days,'price',d.price) END AS duration,json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'email',u.email) AS "user",(SELECT json_build_object('id',p.id,'amount',p.amount,'status',p.status,'paystack_reference',p.reference) FROM payments p WHERE p.advertisement_id=a.id ORDER BY p.created_at DESC LIMIT 1) AS payment FROM advertisements a JOIN users u ON u.id=a.user_id LEFT JOIN advertisement_durations d ON d.id=a.duration_id WHERE a.id=$1`,[req.params.id]);if(!r.rows[0])return fail(res,404,'Advertisement not found');ok(res,r.rows[0]);}catch(e){next(e);}});
app.patch('/api/admin/advertisements/:id/approve',auth,adminOnly,async(req,res,next)=>{try{const a=(await pool.query('SELECT a.*,d.duration_days FROM advertisements a LEFT JOIN advertisement_durations d ON d.id=a.duration_id WHERE a.id=$1',[req.params.id])).rows[0];if(!a)return fail(res,404,'Advertisement not found');if(a.payment_status!=='paid')return fail(res,409,'Advertisement must be paid before approval');const r=await pool.query("UPDATE advertisements SET approval_status='approved',expires_at=COALESCE(expires_at,now()+($1 * interval '1 day')) WHERE id=$2 RETURNING *",[a.duration_days||7,a.id]);ok(res,r.rows[0],'Advertisement approved successfully');}catch(e){next(e);}});
app.patch('/api/admin/advertisements/:id/reject',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query("UPDATE advertisements SET approval_status='rejected',rejection_reason=$1 WHERE id=$2 RETURNING *",[req.body.reason||'Rejected by administrator',req.params.id]);if(!r.rows[0])return fail(res,404,'Advertisement not found');ok(res,r.rows[0],'Advertisement rejected');}catch(e){next(e);}});
app.patch('/api/admin/advertisements/:id/pause',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query("UPDATE advertisements SET approval_status='paused' WHERE id=$1 RETURNING *",[req.params.id]);if(!r.rows[0])return fail(res,404,'Advertisement not found');ok(res,r.rows[0],'Advertisement paused');}catch(e){next(e);}});
app.delete('/api/admin/advertisements/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('DELETE FROM advertisements WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return fail(res,404,'Advertisement not found');ok(res,undefined,'Advertisement deleted successfully');}catch(e){next(e);}});

app.get('/api/admin/durations',auth,adminOnly,async(req,res,next)=>{try{ok(res,(await pool.query('SELECT * FROM advertisement_durations ORDER BY duration_days')).rows);}catch(e){next(e);}});
app.post('/api/admin/durations',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('INSERT INTO advertisement_durations(duration_days,price,is_active) VALUES($1,$2,$3) RETURNING *',[Number(req.body.duration_days),Number(req.body.price),req.body.is_active!==false]);ok(res,r.rows[0],'Duration created successfully');}catch(e){next(e);}});
app.put('/api/admin/durations/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('UPDATE advertisement_durations SET duration_days=COALESCE($1,duration_days),price=COALESCE($2,price),is_active=COALESCE($3,is_active) WHERE id=$4 RETURNING *',[req.body.duration_days!==undefined?Number(req.body.duration_days):null,req.body.price!==undefined?Number(req.body.price):null,req.body.is_active,req.params.id]);if(!r.rows[0])return fail(res,404,'Duration not found');ok(res,r.rows[0],'Duration updated successfully');}catch(e){next(e);}});
app.delete('/api/admin/durations/:id',auth,adminOnly,async(req,res,next)=>{try{const used=await pool.query('SELECT 1 FROM advertisements WHERE duration_id=$1 LIMIT 1',[req.params.id]);if(used.rows[0])return fail(res,409,'Duration is used by existing advertisements');const r=await pool.query('DELETE FROM advertisement_durations WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return fail(res,404,'Duration not found');ok(res,undefined,'Duration deleted successfully');}catch(e){next(e);}});

app.get('/api/admin/payments',auth,adminOnly,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const vals=[];const where=[];if(req.query.search){vals.push(`%${req.query.search}%`);where.push('(p.reference ILIKE $1 OR u.email ILIKE $1 OR u.username ILIKE $1)');}if(req.query.status){vals.push(req.query.status);where.push(`p.status=$${vals.length}`);}const ws=where.length?`WHERE ${where.join(' AND ')}`:'';const c=await pool.query(`SELECT count(*) FROM payments p JOIN users u ON u.id=p.user_id ${ws}`,vals);vals.push(limit,(pg-1)*limit);const r=await pool.query(`SELECT p.id,p.reference AS paystack_reference,p.amount,p.status,p.paid_at,p.created_at,json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'email',u.email,'phone',u.phone) AS "user",CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object('id',a.id,'title',a.title,'duration_days',d.duration_days,'amount',a.amount) END AS advertisement FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN advertisements a ON a.id=p.advertisement_id LEFT JOIN advertisement_durations d ON d.id=a.duration_id ${ws} ORDER BY p.created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/admin/payments/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query(`SELECT p.id,p.reference AS paystack_reference,p.amount,p.status,p.paid_at,p.created_at,json_build_object('id',u.id,'username',u.username,'full_name',u.full_name,'email',u.email,'phone',u.phone) AS "user",CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object('id',a.id,'title',a.title,'duration_days',d.duration_days,'amount',a.amount) END AS advertisement FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN advertisements a ON a.id=p.advertisement_id LEFT JOIN advertisement_durations d ON d.id=a.duration_id WHERE p.id=$1`,[req.params.id]);if(!r.rows[0])return fail(res,404,'Payment not found');ok(res,r.rows[0]);}catch(e){next(e);}});
app.get('/api/admin/payments/stats',auth,adminOnly,async(_req,res,next)=>{try{const total=await pool.query("SELECT COALESCE(sum(amount),0) total_revenue,count(*) total_transactions FROM payments WHERE status='success'");const breakdown=await pool.query('SELECT status,count(*) FROM payments GROUP BY status ORDER BY status');ok(res,{total_revenue:Number(total.rows[0].total_revenue),total_transactions:Number(total.rows[0].total_transactions),status_breakdown:breakdown.rows.map(x=>({status:x.status,count:Number(x.count)}))});}catch(e){next(e);}});

app.get('/api/admin/reports',auth,adminOnly,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const vals=[];const where=[];if(req.query.status){vals.push(req.query.status);where.push(`r.status=$1`);}const ws=where.length?`WHERE ${where.join(' AND ')}`:'';const c=await pool.query(`SELECT count(*) FROM reports r ${ws}`,vals);vals.push(limit,(pg-1)*limit);const r=await pool.query(`SELECT r.*,json_build_object('id',rep.id,'username',rep.username,'full_name',rep.full_name) AS reporter,CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id',u.id,'username',u.username,'full_name',u.full_name) END AS target_user,CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('id',p.id,'name',p.name,'price',p.price) END AS target_product,CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object('id',a.id,'title',a.title) END AS target_advertisement FROM reports r JOIN users rep ON rep.id=r.reporter_id LEFT JOIN users u ON u.id=r.target_user_id LEFT JOIN products p ON p.id=r.target_product_id LEFT JOIN advertisements a ON a.id=r.target_advertisement_id ${ws} ORDER BY r.created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/admin/reports/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query(`SELECT r.*,json_build_object('id',rep.id,'username',rep.username,'full_name',rep.full_name) AS reporter,CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id',u.id,'username',u.username,'full_name',u.full_name) END AS target_user,CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('id',p.id,'name',p.name,'price',p.price) END AS target_product,CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object('id',a.id,'title',a.title) END AS target_advertisement FROM reports r JOIN users rep ON rep.id=r.reporter_id LEFT JOIN users u ON u.id=r.target_user_id LEFT JOIN products p ON p.id=r.target_product_id LEFT JOIN advertisements a ON a.id=r.target_advertisement_id WHERE r.id=$1`,[req.params.id]);if(!r.rows[0])return fail(res,404,'Report not found');ok(res,r.rows[0]);}catch(e){next(e);}});
app.patch('/api/admin/reports/:id/resolve',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query("UPDATE reports SET status='resolved',admin_notes=$1,resolved_by=$2,resolved_at=now() WHERE id=$3 RETURNING *",[req.body.admin_notes||null,req.user.id,req.params.id]);if(!r.rows[0])return fail(res,404,'Report not found');ok(res,r.rows[0],'Report resolved successfully');}catch(e){next(e);}});
app.patch('/api/admin/reports/:id/dismiss',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query("UPDATE reports SET status='dismissed',admin_notes=$1,resolved_by=$2,resolved_at=now() WHERE id=$3 RETURNING *",[req.body.admin_notes||null,req.user.id,req.params.id]);if(!r.rows[0])return fail(res,404,'Report not found');ok(res,r.rows[0],'Report dismissed');}catch(e){next(e);}});

app.get('/api/admin/contact',auth,adminOnly,async(req,res,next)=>{try{const {page:pg,limit}=pagination(req.query);const vals=[];const where=[];if(req.query.search){vals.push(`%${req.query.search}%`);where.push('(name ILIKE $1 OR email ILIKE $1 OR subject ILIKE $1)');}if(req.query.status){vals.push(req.query.status);where.push(`status=$${vals.length}`);}const ws=where.length?`WHERE ${where.join(' AND ')}`:'';const c=await pool.query(`SELECT count(*) FROM contact_messages ${ws}`,vals);vals.push(limit,(pg-1)*limit);const r=await pool.query(`SELECT * FROM contact_messages ${ws} ORDER BY created_at DESC LIMIT $${vals.length-1} OFFSET $${vals.length}`,vals);const total=Number(c.rows[0].count);res.json({success:true,data:r.rows,pagination:{page:pg,limit,total,totalPages:Math.ceil(total/limit)}});}catch(e){next(e);}});
app.get('/api/admin/contact/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('SELECT * FROM contact_messages WHERE id=$1',[req.params.id]);if(!r.rows[0])return fail(res,404,'Contact message not found');ok(res,r.rows[0]);}catch(e){next(e);}});
app.patch('/api/admin/contact/:id/status',auth,adminOnly,async(req,res,next)=>{try{if(!['new','read','replied'].includes(req.body.status))return fail(res,400,'Invalid contact status');const r=await pool.query('UPDATE contact_messages SET status=$1,replied_at=CASE WHEN $1=\'replied\' THEN now() ELSE replied_at END WHERE id=$2 RETURNING *',[req.body.status,req.params.id]);if(!r.rows[0])return fail(res,404,'Contact message not found');ok(res,r.rows[0],'Message status updated');}catch(e){next(e);}});
app.delete('/api/admin/contact/:id',auth,adminOnly,async(req,res,next)=>{try{const r=await pool.query('DELETE FROM contact_messages WHERE id=$1 RETURNING id',[req.params.id]);if(!r.rows[0])return fail(res,404,'Contact message not found');ok(res,undefined,'Message deleted successfully');}catch(e){next(e);}});

app.use('/api', (req,res,next) => { if (res.headersSent) return next(); return fail(res,404,`API endpoint not found: ${req.method} ${req.path}`); });

app.use((err,_req,res,_next) => { console.error(err); if (err.message==='CORS origin not allowed') return fail(res,403,err.message); if (err instanceof multer.MulterError) return fail(res,400,err.message); if (err.message?.includes('image/')) return fail(res,400,'Only image files are allowed'); fail(res,500,'Internal server error'); });

export default app;
