import app, { pool } from './app.js';
import 'dotenv/config';
const port = Number(process.env.PORT) || 10000;
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const server = app.listen(port, '0.0.0.0', () => console.log(`SHINEX API listening on ${port}`));
const shutdown = async () => { server.close(() => pool.end().finally(() => process.exit(0))); };
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);