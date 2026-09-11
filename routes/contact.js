const express = require('express');
const { supabase } = require('../supabase/client');
const { validate, schemas } = require('../middleware/validation');
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const router = express.Router();

// Send contact message
router.post('/', optionalAuth, validate(schemas.contact), async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Defense-in-depth: the request-validation middleware above already
    // requires `subject`, but never let a missing/blank value reach the
    // database — contact_messages.subject is NOT NULL and a bad value
    // here would otherwise surface as a raw DB constraint error to the
    // user instead of a clean validation message.
    const finalSubject = (subject && subject.trim()) ? subject.trim() : 'General Inquiry';

    // Store message
    const { data: contactMessage, error } = await supabase
      .from('contact_messages')
      .insert([
        {
          name,
          email,
          phone: phone || null,
          subject: finalSubject,
          message,
          status: 'new',
          user_id: req.user?.id || null
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Save contact message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.'
      });
    }

    // In a production environment, send email notification
    // For now, just store the message

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      data: {
        id: contactMessage.id,
        status: contactMessage.status,
        created_at: contactMessage.created_at
      }
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// Contact information endpoint
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      email: 'shinexlearning@gmail.com',
      phone: '+234 706 757 4479',
      whatsapp: '+234 802 505 2852',
      address: null // Add if available
    }
  });
});

module.exports = router;


// Authenticated user's support conversations and admin replies.
router.get('/my', authMiddleware, async (req,res)=>{
  try {
    const {data,error}=await supabase.from('contact_messages').select('*, replies:contact_replies(id,admin_id,message,created_at)').eq('user_id',req.user.id).order('created_at',{ascending:false});
    if(error)return res.status(500).json({success:false,message:'Failed to load your support messages'});
    res.json({success:true,data:data||[]});
  } catch(e){console.error(e);res.status(500).json({success:false,message:'Failed to load your support messages'});}
});
module.exports = router;
