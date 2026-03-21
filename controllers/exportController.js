const ExcelJS = require('exceljs');
const Registration = require('../models/registration');
const Activity = require('../models/activity');

const exportController = {
  /**
   * Export participants list to Excel
   */
  exportParticipantsExcel: async (req, res) => {
    try {
      const { activityId } = req.params;

      // Check activity existence and permission
      const activity = await Activity.findById(activityId);
      if (!activity) return res.status(404).json({ message: 'ไม่พบข้อมูลกิจกรรม' });

      // Permission Check: Admin/Superadmin OR Creator
      const isOwner = req.user.role === 'admin' || req.user.role === 'superadmin' || parseInt(activity.creator_id) === parseInt(req.user.id);
      if (!isOwner) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลของกิจกรรมที่ไม่ได้สร้างเอง' });
      }

      const participants = await Registration.getParticipants(activityId);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('รายชื่อผู้สมัคร');

      // Title row
      worksheet.addRow([`รายชื่อผู้สมัครเข้าร่วมกิจกรรม: ${activity.title}`]);
      worksheet.addRow([`รหัสกิจกรรม: ${activity.activity_code}`]);
      worksheet.addRow([]);

      // Headers
      worksheet.addRow([
        'ลับดับ', 
        'รหัสนิสิต', 
        'ชื่อ-นามสกุล', 
        'คณะ', 
        'สถานะการเช็คชื่อ', 
        'ผลการประเมิน',
        'วันที่ลงทะเบียน'
      ]);

      // Styling headers
      const headerRow = worksheet.getRow(4);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: 'center' };

      // Add data
      participants.forEach((p, index) => {
        worksheet.addRow([
          index + 1,
          p.student_code,
          p.student_name,
          p.faculty_name,
          p.is_attended ? 'มาเข้าร่วม' : 'ไม่มาเข้าร่วม',
          p.evaluation_note || '-',
          new Date(p.registered_at).toLocaleDateString('th-TH')
        ]);
      });

      // Adjust column widths
      worksheet.columns = [
        { width: 8 },
        { width: 15 },
        { width: 30 },
        { width: 25 },
        { width: 20 },
        { width: 40 },
        { width: 20 }
      ];

      // Send file
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=participants_${activityId}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('EXCEL EXPORT ERROR:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = exportController;
