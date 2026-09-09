const axios = require('axios');
require('dotenv').config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize Paystack transaction
const initializeTransaction = async (email, amount, reference, metadata = {}) => {
  try {
    // callback_url must point at the Express backend (this server), since
    // /api/advertisements/payment/callback is a backend route — the React
    // frontend at FRONTEND_URL does not serve this path. Set BACKEND_URL
    // in the environment to this server's public URL; falls back to the
    // known production backend origin if unset.
    const backendUrl = process.env.BACKEND_URL || 'https://shinex-marketplace.onrender.com';
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference,
        callback_url: `${backendUrl}/api/advertisements/payment/callback`,
        metadata
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    throw new Error('Failed to initialize payment');
  }
};

// Verify Paystack transaction
const verifyTransaction = async (reference) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    throw new Error('Failed to verify payment');
  }
};

// Verify webhook signature. `payload` must be the raw request body
// (Buffer or raw string) exactly as received — not a re-serialized
// JS object — or the hash will never match what Paystack sent.
const verifyWebhookSignature = (signature, rawPayload) => {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawPayload)
    .digest('hex');
  
  return hash === signature;
};

// Generate unique transaction reference
const generateReference = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `SHINEX-${timestamp}-${random}`;
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  generateReference
};
