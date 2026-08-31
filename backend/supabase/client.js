const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Service role client - for backend operations with full access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Anon client - for operations that should use RLS
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase, supabaseAnon };