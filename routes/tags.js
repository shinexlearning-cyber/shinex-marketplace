const express = require('express');
const { supabase } = require('../supabase/client');
const router = express.Router();
router.get('/', async (req,res)=>{ const {data,error}=await supabase.from('listing_tags').select('id,name,slug').eq('is_active',true).order('name'); if(error)return res.status(500).json({success:false,message:'Failed to load tags'}); res.json({success:true,data:data||[]}); });
module.exports = router;
