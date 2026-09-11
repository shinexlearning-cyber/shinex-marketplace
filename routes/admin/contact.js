const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { getPagination } = require('../../utils/helpers');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all contact messages
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('contact_messages')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%,message.ilike.%${search}%`);
    }

    const { data: messages, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get contact messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch messages'
      });
    }

    res.json({
      success: true,
      data: messages || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Get single contact message
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: message, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Mark as read if status is new
    if (message.status === 'new') {
      await supabase
        .from('contact_messages')
        .update({ status: 'read' })
        .eq('id', id);
      message.status = 'read';
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Get contact message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message'
    });
  }
});

// Update message status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: new, read, or replied'
      });
    }

    const { data: message, error } = await supabase
      .from('contact_messages')
      .update({ 
        status,
        replied_at: status === 'replied' ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message status updated',
      data: message
    });
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message status'
    });
  }
});

// Get message conversation including replies
router.get('/:id/replies', async (req,res)=>{
  const {data,error}=await supabase.from('contact_replies').select('*').eq('contact_message_id',req.params.id).order('created_at',{ascending:true});
  if(error)return res.status(500).json({success:false,message:'Failed to load replies'});
  res.json({success:true,data:data||[]});
});

// Admin reply. Only this protected admin router can create replies.
router.post('/:id/reply', async (req,res)=>{
  const message=String(req.body?.message||'').trim();
  if(!message)return res.status(400).json({success:false,message:'Reply message is required'});
  const {data:contact,error:contactError}=await supabase.from('contact_messages').select('id,user_id').eq('id',req.params.id).single();
  if(contactError||!contact)return res.status(404).json({success:false,message:'Message not found'});
  const {data:reply,error}=await supabase.from('contact_replies').insert({contact_message_id:req.params.id,admin_id:req.user.id,message}).select('*').single();
  if(error)return res.status(500).json({success:false,message:'Failed to save reply'});
  await supabase.from('contact_messages').update({status:'replied',replied_at:new Date().toISOString()}).eq('id',req.params.id);
  if(contact.user_id) await supabase.rpc('create_shinex_notification',{p_user_id:contact.user_id,p_type:'admin_reply',p_title:'Support replied',p_message:'SHINEX support replied to your message.',p_data:{contact_message_id:contact.id}}).catch(()=>{});
  res.status(201).json({success:true,message:'Reply sent',data:reply});
});

// Delete contact message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete contact message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete message'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

module.exports = router;
