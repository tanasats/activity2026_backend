const Registration = require('../models/registration');
const Activity = require('../models/activity');
const fs = require('fs');
const ExifParser = require('exif-parser');
const { getDistance } = require('../utils/geoUtils');

const registrationManagementController = {
  /**
   * Get all participants for an activity
   */
  getParticipants: async (req, res) => {
    try {
      const { activityId } = req.params;
      
      // Check if activity exists and user has permission
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'ไม่พบข้อมูลกิจกรรม' });

      // Permission Check: Admin/Superadmin OR Creator
      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || activity.creator_id === req.user.id;
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้สมัครของกิจกรรมที่ไม่ได้สร้างเอง' });
      }

      const participants = await Registration.getParticipants(activityId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Update participant attendance and evaluation
   */
  updateParticipantStatus: async (req, res) => {
    try {
      const { registrationId } = req.params;
      const { isAttended, evaluationNote, evaluationResult } = req.body;

      // Update logic: need to check activity creator first
      const registration = await Registration.getById(registrationId);
      if (!registration) return res.status(404).json({ message: 'ไม่พบข้อมูลการลงทะเบียน' });
      
      const activity = await Activity.findById(registration.activity_id);
      
      // Permission Check: Admin/Superadmin OR Creator
      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || activity.creator_id === req.user.id;
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขสถานะผู้เข้าร่วมของกิจกรรมนี้' });
      }

      const updated = await Registration.updateParticipantStatus(registrationId, { isAttended, evaluationNote, evaluationResult });
      if (!updated) return res.status(404).json({ message: 'ไม่พบข้อมูลการลงทะเบียน' });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Get registration detail for student (with ownership check)
   */
  getRegistrationDetail: async (req, res) => {
    try {
      const { registrationId } = req.params;
      const registration = await Registration.getDetail(registrationId);

      if (!registration) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลการลงทะเบียน' });
      }

      // Permission Check: Owner Student or Admin/Superadmin
      if (req.user.role === 'student' && parseInt(registration.user_id) !== parseInt(req.user.id)) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลการลงทะเบียนรายนี้' });
      }

      // For Officers: check if they are the creator of the activity
      if (req.user.role === 'officer') {
        const activity = await Activity.findById(registration.activity_id);
        if (parseInt(activity.creator_id) !== parseInt(req.user.id)) {
          return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลของกิจกรรมที่ไม่ได้สร้างเอง' });
        }
      }

      res.json(registration);
    } catch (error) {
      console.error('getRegistrationDetail Error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Check-in participant by QR Code Hash
   */
  checkInByHash: async (req, res) => {
    try {
      const { activityId } = req.params;
      const { qrHash } = req.body;

      if (!qrHash) return res.status(400).json({ message: 'ไม่พบข้อมูล QR Code' });

      // 1. Verify Activity and Permissions
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'ไม่พบข้อมูลกิจกรรม' });

      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || activity.creator_id === req.user.id;
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์จัดการการลงทะเบียนของกิจกรรมนี้' });
      }

      // 2. Perform Check-in
      const registration = await Registration.checkInByHash(activityId, qrHash);
      
      if (!registration) {
        // Double check if already attended
        const result = await Registration.getDetailByHash(activityId, qrHash);
        if (result && result.is_attended) {
          return res.status(400).json({ 
            message: 'นิสิตคนนี้ลงทะเบียนเข้าร่วมแล้ว', 
            studentName: result.student_name,
            studentCode: result.student_code
          });
        }
        return res.status(404).json({ message: 'QR Code ไม่ถูกต้องสำหรับกิจกรรมนี้' });
      }

      // Fetch student details for feedback
      const studentDetail = await Registration.getDetail(registration.id);

      res.json({
        message: 'ลงทะเบียนเข้าร่วมกิจกรรมสำเร็จ',
        studentName: studentDetail.student_name,
        studentCode: studentDetail.student_code,
        facultyName: studentDetail.faculty_name
      });
    } catch (error) {
      console.error('checkInByHash Error:', error);
      res.status(500).json({ message: error.message });
    }
  },
  /**
   * Student Selfie Check-in
   */
  selfieCheckin: async (req, res) => {
    try {
      const { activityId } = req.params;
      const userId = req.user.id;

      if (!req.file) return res.status(400).json({ message: 'กรุณาอัปโหลดรูปภาพเพื่อเช็คอิน' });

      // 1. Get Activity and Registration
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'ไม่พบข้อมูลกิจกรรม' });

      if (!activity.allow_selfie_checkin) {
        return res.status(400).json({ message: 'กิจกรรมนี้ไม่รองรับการเช็คอินด้วยภาพถ่าย' });
      }

      if (!activity.latitude || !activity.longitude) {
        return res.status(400).json({ message: 'ผู้จัดการกิจกรรมยังไม่ได้กำหนดพิกัดสถานที่จัดงาน' });
      }

      // Check if student is registered
      const registrations = await Registration.findByUser(userId);
      const registration = registrations.find(r => r.activity_id == activityId);
      
      if (!registration) {
        return res.status(404).json({ message: 'คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้' });
      }

      if (registration.is_attended) {
        return res.status(400).json({ message: 'คุณได้เช็คอินกิจกรรมนี้ไปแล้ว' });
      }

      // 2. Extract EXIF Data
      const buffer = fs.readFileSync(req.file.path);
      const parser = ExifParser.create(buffer);
      const exifData = parser.parse();

      const { gps, tags } = exifData;

      if (!gps || !gps.Latitude || !gps.Longitude) {
        return res.status(400).json({ 
          message: 'ไม่พบข้อมูลพิกัด GPS ในรูปภาพ กรุณาตรวจสอบว่าคุณได้เปิดสิทธิ์การเข้าถึงตำแหน่งในแอพกล้องถ่ายรูปแล้ว' 
        });
      }

      // 3. Verify Distance
      const distance = getDistance(
        activity.latitude, activity.longitude,
        gps.Latitude, gps.Longitude
      );

      const radius = activity.checkin_radius || 200;
      if (distance > radius) {
        return res.status(400).json({ 
          message: `พิกัดของคุณอยู่นอกพื้นที่จัดกิจกรรม (ระยะห่างปัจจุบัน: ${Math.round(distance)} เมตร, รัศมีที่อนุญาต: ${radius} เมตร)` 
        });
      }

      // 4. Verify Time (using EXIF CreateDate if available, else use current time)
      // Note: EXIF tags.CreateDate is unix timestamp
      const photoTime = tags.CreateDate ? new Date(tags.CreateDate * 1000) : new Date();
      const activityStart = new Date(activity.activity_start);
      const activityEnd = new Date(activity.activity_end);

      // Add a small buffer (e.g., 30 mins before/after)
      const bufferMs = 30 * 60 * 1000;
      if (photoTime < new Date(activityStart.getTime() - bufferMs) || photoTime > new Date(activityEnd.getTime() + bufferMs)) {
        return res.status(400).json({ 
          message: 'เวลาที่ถ่ายภาพไม่อยู่ในช่วงเวลาการจัดกิจกรรม' 
        });
      }

      // 5. Finalize Check-in
      const checkinImage = req.file.path.replace(/\\/g, '/');
      const updated = await Registration.selfieCheckIn(registration.id, {
        checkinImage,
        lat: gps.Latitude,
        lng: gps.Longitude
      });

      res.json({
        message: 'เช็คอินสำเร็จ! ขอบคุณที่เข้าร่วมกิจกรรม',
        distance: Math.round(distance),
        time: photoTime.toLocaleString('th-TH')
      });

    } catch (error) {
      console.error('selfieCheckin Error:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = registrationManagementController;
