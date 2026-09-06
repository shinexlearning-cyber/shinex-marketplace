const validator = require('validator');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    // Validate body
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
        
        if (rules.required && !value) {
          errors.push(`${field} is required`);
        }
        
        if (value && rules.type) {
          if (rules.type === 'email' && !validator.isEmail(value)) {
            errors.push(`${field} must be a valid email address`);
          }
          if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`${field} must be a string`);
          }
          if (rules.type === 'number' && typeof value !== 'number') {
            errors.push(`${field} must be a number`);
          }
          if (rules.type === 'boolean' && typeof value !== 'boolean') {
            errors.push(`${field} must be a boolean`);
          }
        }
        
        if (value && rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        
        if (value && rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must not exceed ${rules.maxLength} characters`);
        }
        
        if (value && rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  register: {
    body: {
      full_name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
      username: { required: true, type: 'string', minLength: 3, maxLength: 50, pattern: /^[a-zA-Z0-9_]+$/ },
      email: { required: true, type: 'email' },
      phone: { required: true, type: 'string', minLength: 10, maxLength: 20 },
      password: { required: true, type: 'string', minLength: 8 }
    }
  },
  
  login: {
    body: {
      email: { required: true, type: 'email' },
      password: { required: true, type: 'string', minLength: 8 }
    }
  },
  
  product: {
    body: {
      name: { required: true, type: 'string', maxLength: 255 },
      description: { required: false, type: 'string' },
      price: { required: true, type: 'number' },
      category_id: { required: true, type: 'string' },
      condition: { required: false, type: 'string', maxLength: 50 },
      location: { required: false, type: 'string', maxLength: 255 }
    }
  },
  
  advertisement: {
    body: {
      title: { required: true, type: 'string', maxLength: 255 },
      description: { required: false, type: 'string' },
      duration_id: { required: true, type: 'string' }
    }
  },
  
  report: {
    body: {
      reason: { required: true, type: 'string', maxLength: 255 },
      description: { required: false, type: 'string' }
    }
  },
  
  contact: {
    body: {
      name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
      email: { required: true, type: 'email' },
      phone: { required: false, type: 'string', maxLength: 20 },
      subject: { required: true, type: 'string', maxLength: 255 },
      message: { required: true, type: 'string', minLength: 10 }
    }
  }
};

module.exports = {
  validate,
  schemas
};
