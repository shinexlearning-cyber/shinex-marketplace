const express = require('express');
const authMiddleware = require('../middleware/auth');
const { supabase } = require('../supabase/client');
const router = express.Router();
router.use(authMiddleware);
router.get('/', async (req,res)=>{ const limit=Math.min(Math.max(Number(req.query.limit)||30,1),100); const {data,error}=await supabase.from('notifications').select('*').eq('user_id',req.user.id).order('created_at',{ascending:false}).limit(limit); if(error)return res.status(500).json({success:false,message:'Failed to load notifications'}); res.json({success:true,data:data||[]}); });
router.patch('/:id/read', async (req,res)=>{ const {data,error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',req.params.id).eq('user_id',req.user.id).select('*').single(); if(error||!data)return res.status(404).json({success:false,message:'Notification not found'}); res.json({success:true,data}); });
router.patch('/read-all', async (req,res)=>{ const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',req.user.id).is('read_at',null); if(error)return res.status(500).json({success:false,message:'Failed to mark notifications read'}); res.json({success:true,message:'Notifications marked as read'}); });
module.exports = router;
