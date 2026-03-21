const User = require('../models/user');
const path = require('path');
const fs = require('fs');

const userController = {
  /**
   * Get current user profile
   */
  getProfile: async (req, res) => {
    try {
      const user = await User.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update user profile (Firstname, Lastname, Username)
   */
  updateProfile: async (req, res) => {
    try {
      const { firstname, lastname, username } = req.body;
      const userId = req.user.id;

      const updatedUser = await User.updateProfile(userId, {
        username,
        firstname,
        lastname
      });

      res.json({
        message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update profile image
   */
  updateProfileImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพ' });
      }

      const userId = req.user.id;
      const profileImage = `/uploads/profiles/${req.file.filename}`;

      // Optionally delete old image if it's not the default one
      const user = await User.findByEmail(req.user.email);
      if (user && user.profile_image && user.profile_image.startsWith('/uploads/profiles/')) {
        const oldImagePath = path.join(__dirname, '..', user.profile_image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      const updatedUser = await User.updateProfile(userId, { profileImage });

      res.json({
        message: 'อัปเดตรูปโปรไฟล์สำเร็จ',
        profileImage: updatedUser.profile_image,
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  getUsers: async (req, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'superadmin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const { search, role: roleFilter, facultyCode, page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await User.findAll({
        search,
        role: roleFilter,
        facultyCode,
        limit: parseInt(limit, 10),
        offset
      });

      res.json({
        ...result,
        currentPage: parseInt(page, 10)
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  adminUpdateUser: async (req, res) => {
    try {
      const { role: requesterRole } = req.user;
      if (requesterRole !== 'admin' && requesterRole !== 'superadmin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const { id } = req.params;
      const { role, faculty_code, username, firstname, lastname } = req.body;

      // Prevent non-superadmins from promoting to superadmin
      if (role === 'superadmin' && requesterRole !== 'superadmin') {
        return res.status(403).json({ message: 'Only superadmins can assign the superadmin role' });
      }

      const updatedUser = await User.adminUpdate(id, { role, faculty_code, username, firstname, lastname });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  adminDeleteUser: async (req, res) => {
    try {
      const { role: requesterRole } = req.user;
      if (requesterRole !== 'admin' && requesterRole !== 'superadmin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
      }

      const { id } = req.params;
      
      // Prevent deleting self
      if (parseInt(id, 10) === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const deletedUser = await User.delete(id);
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully', user: deletedUser });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = userController;
