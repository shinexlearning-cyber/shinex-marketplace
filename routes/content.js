const express = require('express');
const { supabase } = require('../supabase/client');
const router = express.Router();
router.get('/:slug', async (req,res)=>{ const {data,error}=await supabase.from('content_pages').select('slug,title,content,updated_at').eq('slug',req.params.slug).eq('is_published',true).maybeSingle(); if(error)return res.status(500).json({success:false,message:'Failed to load content'}); if(!data)return res.status(404).json({success:false,message:'Content not found'}); res.json({success:true,data}); });
module.exports = router;
