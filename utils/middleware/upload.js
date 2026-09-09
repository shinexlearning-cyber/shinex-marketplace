const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, and SVG are allowed.'), false);
  }
};

// Set limits
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 5 // Max 5 files per upload
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits
});

// Single image upload
const uploadSingle = upload.single('image');

// Multiple images upload (max 5)
const uploadMultiple = upload.array('images', 5);

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple
};
