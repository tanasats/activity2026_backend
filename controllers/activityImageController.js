const ActivityImage = require('../models/activityImage');
const Activity = require('../models/activity');
const path = require('path');
const fs = require('fs');

const activityImageController = {
  /**
   * Get all photos for an activity
   */
  getImages: async (req, res) => {
    try {
      const { activityId } = req.params;
      const images = await ActivityImage.getForActivity(activityId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Upload an activity photo
   */
  uploadImage: async (req, res) => {
    try {
      const { activityId } = req.params;
      const { caption } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'กรุณาเลือกไฟล์ภาพ' });
      }

      // Check if activity exists and user has permission
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'ไม่พบข้อมูลกิจกรรม' });

      // Permission Check: Admin/Superadmin OR Creator
      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || parseInt(activity.creator_id) === parseInt(req.user.id);
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์จัดการกิจกรรมที่ไม่ได้สร้างเอง' });
      }

      const imagePath = `/uploads/${req.file.filename}`;
      const newImage = await ActivityImage.create(activityId, imagePath, caption);

      res.status(201).json(newImage);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Delete an activity photo
   */
  deleteImage: async (req, res) => {
    try {
      const { imageId } = req.params;
      
      const image = await ActivityImage.findById(imageId);
      if (!image) return res.status(404).json({ message: 'ไม่พบรูปภาพ' });

      // Check activity permission
      const activity = await Activity.findById(image.activity_id);
      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || parseInt(activity.creator_id) === parseInt(req.user.id);
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบรูปภาพของกิจกรรมที่ไม่ได้สร้างเอง' });
      }

      // Delete from DB
      await ActivityImage.delete(imageId);

      // Delete physical file
      const fullPath = path.join(__dirname, '..', image.image_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      res.json({ message: 'ลบรูปภาพสำเร็จ' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = activityImageController;
