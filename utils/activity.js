const { supabase } = require('../supabase/client');

// Best-effort activity logger. Never throws — a failure to log an
// activity entry must never break the real action (creating a product,
// confirming a payment, etc.) that triggered it.
const logActivity = async (userId, type, message, metadata = {}) => {
  try {
    if (!userId || !type || !message) return;
    await supabase.from('activity').insert([
      { user_id: userId, type, message, metadata }
    ]);
  } catch (error) {
    console.error('Activity log error (non-fatal):', error);
  }
};

module.exports = { logActivity };
