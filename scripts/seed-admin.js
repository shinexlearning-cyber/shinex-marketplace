import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/app.js';
const [,,email,username,password,fullName='SHINEX Admin'] = process.argv;
if (!email || !username || !password || password.length < 12) { console.error('Usage: npm run seed:admin -- email username password "Full Name" (password >= 12 chars)'); process.exit(1); }
try { const hash=await bcrypt.hash(password,12); await pool.query('INSERT INTO users(email,username,password_hash,full_name,is_admin) VALUES($1,$2,$3,$4,true) ON CONFLICT(email) DO UPDATE SET is_admin=true,password_hash=$3', [email.toLowerCase(),username,hash,fullName]); console.log('Administrator seeded.'); } finally { await pool.end(); }