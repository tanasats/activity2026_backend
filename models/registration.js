const { query } = require('../config/db');

const Registration = {
  create: async (userId, activityId) => {
    const result = await query(
      'INSERT INTO registrations (user_id, activity_id, qr_code_hash) VALUES ($1, $2, gen_random_uuid()) RETURNING *',
      [userId, activityId]
    );
    return result.rows[0];
  },

  getById: async (id) => {
    const result = await query('SELECT * FROM registrations WHERE id = $1', [id]);
    return result.rows[0];
  },

  getDetail: async (id) => {
    const result = await query(
      `SELECT r.*, 
              a.title as activity_title, a.activity_code, a.activity_start, a.activity_end, a.location, a.hours, a.credits,
              u.username as student_name, u.email as student_email, SPLIT_PART(u.email, '@', 1) as student_code,
              f.faculty_name
       FROM registrations r
       JOIN activities a ON r.activity_id = a.id
       JOIN userauth u ON r.user_id = u.id
       LEFT JOIN faculties f ON u.faculty_code = f.faculty_code
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  getParticipants: async (activityId) => {
    const result = await query(
      `SELECT r.*, u.username as student_name, SPLIT_PART(u.email, '@', 1) as student_code, f.faculty_name
       FROM registrations r
       JOIN userauth u ON r.user_id = u.id
       LEFT JOIN faculties f ON u.faculty_code = f.faculty_code
       WHERE r.activity_id = $1
       ORDER BY student_code ASC`,
      [activityId]
    );
    return result.rows;
  },

  updateParticipantStatus: async (id, { isAttended, evaluationNote, evaluationResult }) => {
    const result = await query(
      `UPDATE registrations 
       SET is_attended = COALESCE($2, is_attended),
           evaluation_note = COALESCE($3, evaluation_note),
           evaluation_result = COALESCE($4, evaluation_result)
       WHERE id = $1 RETURNING *`,
      [id, isAttended, evaluationNote, evaluationResult]
    );
    return result.rows[0];
  },

  findByUser: async (userId) => {
    const result = await query(
      `SELECT r.*, a.title, a.hours, a.credits, a.activity_start, a.status as activity_status
       FROM registrations r 
       JOIN activities a ON r.activity_id = a.id 
       WHERE r.user_id = $1
       ORDER BY a.activity_start DESC`,
      [userId]
    );
    return result.rows;
  },

  countForActivity: async (activityId) => {
    const result = await query(
      'SELECT COUNT(*) FROM registrations WHERE activity_id = $1',
      [activityId]
    );
    return parseInt(result.rows[0].count);
  },

  delete: async (id) => {
    const result = await query('DELETE FROM registrations WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  checkInByHash: async (activityId, qrHash) => {
    const result = await query(
      `UPDATE registrations 
       SET is_attended = true, 
           registered_at = COALESCE(registered_at, CURRENT_TIMESTAMP)
       WHERE activity_id = $1 AND qr_code_hash = $2 AND is_attended = false
       RETURNING *`,
      [activityId, qrHash]
    );
    return result.rows[0];
  },

  getDetailByHash: async (activityId, qrHash) => {
    const result = await query(
      `SELECT r.*, u.username as student_name, SPLIT_PART(u.email, '@', 1) as student_code
       FROM registrations r
       JOIN userauth u ON r.user_id = u.id
       WHERE r.activity_id = $1 AND r.qr_code_hash = $2`,
      [activityId, qrHash]
    );
    return result.rows[0];
  }
};

module.exports = Registration;
