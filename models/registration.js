const { query } = require('../config/db');

const Registration = {
  create: async (userId, activityId) => {
    const result = await query(
      'INSERT INTO registrations (user_id, activity_id) VALUES ($1, $2) RETURNING *',
      [userId, activityId]
    );
    return result.rows[0];
  },

  findByUser: async (userId) => {
    const result = await query(
      `SELECT r.*, a.title, a.hours, a.credits, a.activity_start 
       FROM registrations r 
       JOIN activities a ON r.activity_id = a.id 
       WHERE r.user_id = $1`,
      [userId]
    );
    return result.rows; // Return all rows, not just the first one
  },

  updateStatus: async (registrationId, status) => {
    const result = await query(
      'UPDATE registrations SET status = $1 WHERE id = $2 RETURNING *',
      [status, registrationId]
    );
    return result.rows[0];
  },

  countForActivity: async (activityId) => {
    const result = await query(
      'SELECT COUNT(*) FROM registrations WHERE activity_id = $1 AND status != $2',
      [activityId, 'cancelled']
    );
    return parseInt(result.rows[0].count);
  }
};

module.exports = Registration;
