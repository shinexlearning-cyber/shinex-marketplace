const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadImage = async (fileBuffer, folder, publicId = null) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: folder,
        resource_type: 'image'
      };
      
      if (publicId) {
        uploadOptions.public_id = publicId;
      }
      
      // Convert buffer to base64 for upload
      const base64String = fileBuffer.toString('base64');
      const dataURI = `data:image/jpeg;base64,${base64String}`;
      
      cloudinary.uploader.upload(dataURI, uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        }
      });
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

// Delete multiple images
const deleteImages = async (publicIds) => {
  try {
    const results = await Promise.all(
      publicIds.map(publicId => deleteImage(publicId))
    );
    return results;
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw new Error('Failed to delete images');
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  deleteImages
};
