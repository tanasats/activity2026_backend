const RegistrationImage = require('../models/registrationImage');
const Registration = require('../models/registration');
const fs = require('fs');
const path = require('path');

const registrationImageController = {
  /**
   * Upload evidence image for a registration
   */
  uploadImage: async (req, res) => {
    try {
      const { registrationId } = req.params;
      const { caption } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'กรุณาเลือกไฟล์ภาพ' });
      }

      // 1. Verify Registration ownership (must be the student or admin)
      const registration = await Registration.getById(registrationId);
      if (!registration) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลการลงทะเบียน' });
      }

      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || registration.user_id === req.user.id;
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อัปโหลดภาพหลักฐานให้กับการลงทะเบียนนี้' });
      }

      // 2. Check Limit (max 5)
      const currentCount = await RegistrationImage.countByRegistrationId(registrationId);
      if (currentCount >= 5) {
        // Delete uploaded file if limit exceeded
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'คุณสามารถอัปโหลดภาพหลักฐานได้สูงสุด 5 ภาพต่อหนึ่งกิจกรรม' });
      }

      const imagePath = `/uploads/${req.file.filename}`;
      const image = await RegistrationImage.create(registrationId, imagePath, caption);

      res.status(201).json(image);
    } catch (error) {
      console.error('uploadImage Error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Get all images for a registration
   */
  getImages: async (req, res) => {
    try {
      const { registrationId } = req.params;
      
      // Permission check
      const registration = await Registration.getById(registrationId);
      if (!registration) return res.status(404).json({ message: 'ไม่พบข้อมูลการลงทะเบียน' });

      // Student owner, or creator of activity, or admin
      // Note: we need activity creator check too for officers to view student evidence
      const isAllowed = req.user.role === 'admin' || req.user.role === 'superadmin' || registration.user_id === req.user.id;
      
      if (!isAllowed) {
        // Check if officer is the creator of the activity
        const Activity = require('../models/activity');
        const activity = await Activity.findById(registration.activity_id);
        if (activity.creator_id !== req.user.id) {
          return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลชุดนี้' });
        }
      }

      const images = await RegistrationImage.findByRegistrationId(registrationId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Delete an image
   */
  deleteImage: async (req, res) => {
    try {
      const { imageId } = req.params;
      const image = await RegistrationImage.findById(imageId);

      if (!image) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลรูปภาพ' });
      }

      // Check ownership of the registration
      const registration = await Registration.getById(image.registration_id);
      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || registration.user_id === req.user.id;

      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบรูปภาพนี้' });
      }

      // Delete from DB
      await RegistrationImage.delete(imageId);

      // Delete from File System
      const filePath = path.join(__dirname, '..', image.image_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ message: 'ลบรูปภาพเรียบร้อยแล้ว' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = registrationImageController;
