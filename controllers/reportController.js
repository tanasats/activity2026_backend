const Registration = require('../models/registration');
const Activity = require('../models/activity');
const { query } = require('../config/db');

/**
 * Controller for Dashboard Reports and Transcripts
 */
const reportController = {
  /**
   * Get Dashboard Data based on User Role
   */
  getDashboardData: async (req, res) => {
    try {
      const { role, id: userId, faculty_code: facultyCode } = req.user;
      const currentYearBE = new Date().getFullYear() + 543;
      const year = req.query.year || currentYearBE.toString();
      let data = { role, year: parseInt(year, 10) };

      if (role === 'student') {
        const registrations = await Registration.findByUser(userId);
        const stats = await query(
          `SELECT COUNT(*) as total_activities, SUM(a.hours) as total_hours, SUM(a.credits) as total_credits 
           FROM registrations r 
           JOIN activities a ON r.activity_id = a.id 
           WHERE r.user_id = $1 AND r.evaluation_result = $2
           AND a.academic_year = $3`,
          [userId, 'pass', year]
        );
        
        // Recommended activities (Active activities not yet registered by this student)
        const recommended = await query(
          `SELECT a.* FROM activities a 
           WHERE a.status = 'ดำเนินการ' 
           AND a.id NOT IN (SELECT activity_id FROM registrations WHERE user_id = $1)
           ORDER BY a.activity_start ASC LIMIT 5`,
          [userId]
        );

        data = {
          ...data,
          summary: stats.rows[0] || { total_activities: 0, total_hours: 0, total_credits: 0 },
          registrations: registrations,
          recommended: recommended.rows
        };
      } else if (role === 'officer') {
        // Stats for activities created by this officer
        const myStats = await query(
          `SELECT COUNT(*) as activity_count, 
           (SELECT COUNT(*) FROM registrations r JOIN activities a ON r.activity_id = a.id WHERE a.creator_id = $1 AND a.academic_year = $2) as participant_count
           FROM activities WHERE creator_id = $1 AND academic_year = $2`,
          [userId, year]
        );

        // Stats for all activities in the officer's faculty
        const facultyStats = await query(
          `SELECT COUNT(*) as activity_count,
           (SELECT COUNT(*) FROM registrations r JOIN activities a ON r.activity_id = a.id WHERE a.owner_faculty_code = $1 AND a.academic_year = $2) as participant_count
           FROM activities a
           WHERE a.owner_faculty_code = $1 AND a.academic_year = $2`,
          [facultyCode, year]
        );

        const myActivities = await query(
          'SELECT * FROM activities WHERE creator_id = $1 AND academic_year = $2 ORDER BY created_at DESC',
          [userId, year]
        );

        const facultyActivities = await query(
          `SELECT a.*, u.username as creator_name 
           FROM activities a 
           JOIN userauth u ON a.creator_id = u.id 
           WHERE a.owner_faculty_code = $1 
           AND a.academic_year = $2
           ORDER BY a.created_at DESC LIMIT 10`,
          [facultyCode, year]
        );

        data = {
          ...data,
          myStats: myStats.rows[0],
          facultyStats: facultyStats.rows[0],
          myActivities: myActivities.rows,
          facultyActivities: facultyActivities.rows
        };
      } else if (role === 'admin' || role === 'superadmin') {
        const pendingCount = await query("SELECT COUNT(*) FROM activities WHERE status = 'ขออนุมัติ' AND academic_year = $1", [year]);
        const activeCount = await query("SELECT COUNT(*) FROM activities WHERE status = 'ดำเนินการ' AND academic_year = $1", [year]);
        
        const facultyDistribution = await query(
          `SELECT f.faculty_name, COUNT(a.id) as activity_count 
           FROM faculties f 
           LEFT JOIN userauth u ON f.faculty_code = u.faculty_code 
           LEFT JOIN activities a ON u.id = a.creator_id 
           WHERE a.academic_year = $1 OR a.academic_year IS NULL
           GROUP BY f.faculty_name 
           HAVING COUNT(a.id) > 0`,
          [year]
        );

        if (role === 'superadmin') {
          const totalUsers = await query("SELECT COUNT(*) FROM userauth");
          const roleDistribution = await query("SELECT role, COUNT(*) as count FROM userauth GROUP BY role");
          const totalRegistrations = await query("SELECT COUNT(*) FROM registrations r JOIN activities a ON r.activity_id = a.id WHERE a.academic_year = $1", [year]);
          
          data = {
            ...data,
            stats: {
              pending: pendingCount.rows[0].count,
              active: activeCount.rows[0].count,
              totalUsers: totalUsers.rows[0].count,
              totalRegistrations: totalRegistrations.rows[0].count
            },
            roleDistribution: roleDistribution.rows,
            facultyDistribution: facultyDistribution.rows
          };
        } else {
          // Standard Admin
          const totalUsers = await query("SELECT COUNT(*) FROM userauth");
          data = {
            ...data,
            stats: {
              pending: pendingCount.rows[0].count,
              active: activeCount.rows[0].count,
              totalUsers: totalUsers.rows[0].count
            },
            facultyDistribution: facultyDistribution.rows
          };
        }
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Get Activity Transcript (Student only)
   */
  getTranscript: async (req, res) => {
    try {
      const { id: userId } = req.user;
      const result = await query(
        `SELECT a.title, a.hours, a.credits, a.activity_start as activity_date, r.status 
         FROM registrations r 
         JOIN activities a ON r.activity_id = a.id 
         WHERE r.user_id = $1 AND r.status = 'attended'
         ORDER BY a.activity_start DESC`,
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = reportController;
