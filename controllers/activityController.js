const Activity = require('../models/activity');
const Registration = require('../models/registration');

/**
 * Controller for Activities and Registrations
 */
const activityController = {
  /**
   * Get all active activities for public/student view
   */
  getPublicActivities: async (req, res) => {
    try {
      const { page, limit, search, academicYear, semester } = req.query;
      const { rows, total } = await Activity.findAll({
        status: 'ดำเนินการ',
        publishStatus: 'public',
        page,
        limit,
        search,
        academicYear,
        semester
      });
      res.json({ rows, total, page: parseInt(page) || 1, limit: parseInt(limit) || 10 });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Get all activities for management (Officer/Admin)
   */
  getManageActivities: async (req, res) => {
    try {
      const { page, limit, search, academicYear, semester, status } = req.query;
      const filters = {
        page,
        limit,
        search,
        academicYear,
        semester,
        status
      };

      if (req.user.role === 'officer') {
        filters.creatorId = req.user.id;
      }

      const { rows, total } = await Activity.findAll(filters);
      res.json({ rows, total, page: parseInt(page) || 1, limit: parseInt(limit) || 10 });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Get activity by ID
   */
  getActivityById: async (req, res) => {
    try {
      const activity = await Activity.findById(req.params.id);
      if (!activity) return res.status(404).json({ message: 'Activity not found' });

      // If management headers or specific management flag is used, check access
      // For now, simple view is fine, but we might want to restrict if it's private
      if (activity.publish_status === 'private' && req.user.role === 'officer' && activity.owner_faculty_code !== req.user.faculty_code) {
        return res.status(403).json({ message: 'Access denied to this activity' });
      }

      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Create a new activity
   */
  createActivity: async (req, res) => {
    try {
      const data = { ...req.body };

      // Handle multi-field file upload
      if (req.files) {
        if (req.files['coverImage']) {
          data.coverImage = req.files['coverImage'][0].path.replace(/\\/g, '/');
        }
      }

      // Handle stringified arrays from FormData
      try {
        if (typeof data.skills === 'string') {
          data.skills = JSON.parse(data.skills).filter(s => s && s !== "");
        } else if (Array.isArray(data.skills)) {
          data.skills = data.skills.filter(s => s && s !== "");
        } else {
          data.skills = [];
        }

        if (typeof data.faculties === 'string') {
          data.faculties = JSON.parse(data.faculties).filter(f => f && f !== "");
        } else if (Array.isArray(data.faculties)) {
          data.faculties = data.faculties.filter(f => f && f !== "");
        } else {
          data.faculties = [];
        }
      } catch (e) {
        console.error('Error parsing skills/faculties:', e);
        data.skills = data.skills || [];
        data.faculties = data.faculties || [];
      }

      // Officers can only create activities for their own faculty
      if (req.user.role === 'officer') {
        data.ownerFacultyCode = req.user.faculty_code;
      } else if (!data.ownerFacultyCode && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        // For Admins/Superadmins, if no ownerFacultyCode is provided, we might leave it as null
        // or they can select one. For now, let's assume they can provide it in req.body.
      }

      // Force private status if it's "ขออนุมัติ" (default)
      if (!data.status || data.status === 'ขออนุมัติ') {
        data.publishStatus = 'private';
      }

      const activity = await Activity.create(data, req.user.id);

      // Handle Attachments
      if (req.files && req.files['attachments'] && activity.id) {
        let metadata = [];
        if (data.attachmentMetadata) {
          try {
            metadata = JSON.parse(data.attachmentMetadata);
          } catch (e) {
            console.error('Error parsing metadata:', e);
            metadata = [];
          }
        }

        for (const file of req.files['attachments']) {
          const fileMeta = metadata.find(m => m.originalName === file.originalname) || {};
          const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8');
          await Activity.addAttachment(activity.id, {
            filePath: file.path.replace(/\\/g, '/'),
            fileName: utf8Name,
            displayName: fileMeta.displayName || utf8Name,
            isPublished: fileMeta.isPublished !== undefined ? fileMeta.isPublished : true
          });
        }
      }

      res.status(201).json(activity);
    } catch (error) {
      console.error('ERROR in createActivity:', error);
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Approve an activity (Status: ดำเนินการ)
   */
  approveActivity: async (req, res) => {
    try {
      // Extra check despite middleware
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Only admins can approve activities' });
      }

      const activity = await Activity.updateStatus(req.params.id, 'ดำเนินการ', req.user.id);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update activity visibility (publishStatus)
   */
  updateVisibility: async (req, res) => {
    try {
      const activityId = req.params.id;
      const { publishStatus } = req.body;
      const activity = await Activity.findById(activityId);

      if (!activity) return res.status(404).json({ message: 'Activity not found' });

      // RBAC Ownership Check
      if (req.user.role === 'officer' && activity.owner_faculty_code !== req.user.faculty_code) {
        return res.status(403).json({ message: 'You can only change visibility for activities in your own faculty' });
      }

      // Visibility Restriction: Request Approval must be private
      if (activity.status === 'ขออนุมัติ' && publishStatus === 'public') {
        return res.status(400).json({ message: 'กิจกรรมที่อยู่ในสถานะ "ขออนุมัติ" จะต้องเป็น Private เท่านั้น' });
      }

      const updated = await Activity.updateVisibility(activityId, publishStatus, req.user.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update activity status (ขออนุมัติ, ดำเนินการ, ปิดกิจกรรม)
   */
  changeStatus: async (req, res) => {
    try {
      const activityId = req.params.id;
      const { status } = req.body;
      const activity = await Activity.findById(activityId);

      if (!activity) return res.status(404).json({ message: 'Activity not found' });

      // RBAC Rules
      if (req.user.role === 'officer') {
        // Officer can only change to 'ปิดกิจกรรม'
        if (status !== 'ปิดกิจกรรม') {
          return res.status(403).json({ message: 'เจ้าหน้าที่สามารถเปลี่ยนสถานะเป็น "ปิดกิจกรรม" ได้เท่านั้น' });
        }
        // Officer must be the creator
        if (parseInt(activity.creator_id) !== parseInt(req.user.id)) {
          return res.status(403).json({ message: 'คุณสามารถปิดได้เฉพาะกิจกรรมที่คุณสร้างขึ้นเองเท่านั้น' });
        }
      } else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        // Admin can change to 'ปิดกิจกรรม' or 'ดำเนินการ'
        if (status !== 'ปิดกิจกรรม' && status !== 'ดำเนินการ') {
          return res.status(400).json({ message: 'สถานะไม่ถูกต้อง (ต้องเป็น "ปิดกิจกรรม" หรือ "ดำเนินการ")' });
        }
      } else {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เปลี่ยนสถานะกิจกรรม' });
      }

      const updated = await Activity.updateStatus(activityId, status, req.user.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update an existing activity
   */
  updateActivity: async (req, res) => {
    try {
      const activityId = req.params.id;
      const activity = await Activity.findById(activityId);

      if (!activity) return res.status(404).json({ message: 'Activity not found' });

      // RBAC Ownership Check: Admin/Superadmin OR Creator
      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || parseInt(activity.creator_id) === parseInt(req.user.id);
      
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขกิจกรรมที่ไม่ได้สร้างเอง' });
      }

      if (req.user.role === 'officer') {
        // Status Check: Cannot edit if status is 'ปิดกิจกรรม'
        if (activity.status === 'ปิดกิจกรรม') {
          return res.status(403).json({ message: 'ไม่สามารถแก้ไขกิจกรรมที่ปิดแล้วได้' });
        }
      }

      const data = { ...req.body };

      // Visibility Restriction: Request Approval must be private
      if (activity.status === 'ขออนุมัติ' && data.publishStatus === 'public') {
        return res.status(400).json({ message: 'กิจกรรมที่อยู่ในสถานะ "ขออนุมัติ" จะต้องเป็น Private เท่านั้น' });
      }

      // Handle multi-field file upload
      if (req.files) {
        if (req.files['coverImage']) {
          data.coverImage = req.files['coverImage'][0].path.replace(/\\/g, '/');
        }
      }

      // Handle stringified arrays from FormData
      if (typeof data.skills === 'string') {
        try { data.skills = JSON.parse(data.skills); } catch (e) { data.skills = []; }
      }
      if (typeof data.faculties === 'string') {
        try { data.faculties = JSON.parse(data.faculties); } catch (e) { data.faculties = []; }
      }

      const updated = await Activity.update(activityId, data, req.user.id);

      // Handle New Attachments
      if (req.files && req.files['attachments']) {
        let metadata = [];
        if (data.attachmentMetadata) {
          try {
            metadata = JSON.parse(data.attachmentMetadata);
          } catch (e) {
            console.error('Error parsing metadata:', e);
            metadata = [];
          }
        }

        for (const file of req.files['attachments']) {
          const fileMeta = metadata.find(m => m.originalName === file.originalname) || {};

          await Activity.addAttachment(activityId, {
            filePath: file.path.replace(/\\/g, '/'),
            fileName: file.originalname,
            displayName: fileMeta.displayName || file.originalname,
            isPublished: fileMeta.isPublished !== undefined ? fileMeta.isPublished : true
          });
        }
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Delete an activity
   */
  deleteActivity: async (req, res) => {
    try {
      const activityId = req.params.id;
      const activity = await Activity.findById(activityId);

      if (!activity) return res.status(404).json({ message: 'Activity not found' });

      // RBAC Ownership Check: Officer can only delete if they are the creator
      if (req.user.role === 'officer' && parseInt(activity.creator_id) !== parseInt(req.user.id)) {
        return res.status(403).json({ message: 'คุณสามารถลบได้เฉพาะกิจกรรมที่คุณสร้างขึ้นเองเท่านั้น' });
      }

      await Activity.delete(activityId);
      res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update individual attachment visibility
   */
  updateAttachmentVisibility: async (req, res) => {
    try {
      const { attachmentId } = req.params;
      const { isPublished } = req.body;

      const updated = await Activity.updateAttachmentVisibility(attachmentId, isPublished);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update individual attachment details
   */
  updateAttachment: async (req, res) => {
    try {
      const { attachmentId } = req.params;
      const { displayName, isPublished } = req.body;

      const updated = await Activity.updateAttachment(attachmentId, { displayName, isPublished });
      if (!updated) return res.status(404).json({ message: 'Attachment not found' });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Delete an attachment
   */
  deleteAttachment: async (req, res) => {
    try {
      const { attachmentId } = req.params;

      // Potential: Add fs.unlink here to delete actual file if needed
      const deleted = await Activity.deleteAttachment(attachmentId);
      res.json(deleted);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Register a student for an activity
   */
  registerActivity: async (req, res) => {
    try {
      const activityId = req.params.id;
      const userId = req.user.id;

      // Check if activity exists and is open
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'ไม่พบข้อมูลกิจกรรม' });

      if (activity.status !== 'ดำเนินการ') {
        return res.status(400).json({ message: 'กิจกรรมนี้ยังไม่เปิดให้ลงทะเบียน' });
      }

      // Check capacity
      const currentParticipants = await Registration.countForActivity(activityId);
      if (activity.max_participants && currentParticipants >= activity.max_participants) {
        return res.status(400).json({ message: 'กิจกรรมนี้มีผู้สมัครเต็มจำนวนแล้ว (Full)' });
      }

      const registration = await Registration.create(userId, activityId);
      res.status(201).json(registration);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'คุณได้ลงทะเบียนกิจกรรมนี้ไปแล้ว' });
      }
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = activityController;
