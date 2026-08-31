const express = require('express');
const { supabase } = require('../supabase/client');
const { validate, schemas } = require('../middleware/validation');
const router = express.Router();

// Send contact message
router.post('/', validate(schemas.contact), async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Store message
    const { data: contactMessage, error } = await supabase
      .from('contact_messages')
      .insert([
        {
          name,
          email,
          phone: phone || null,
          subject,
          message,
          status: 'new'
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
