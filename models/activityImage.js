const { query } = require('../config/db');

const ActivityImage = {
  getForActivity: async (activityId) => {
    const result = await query(
      'SELECT * FROM activity_images WHERE activity_id = $1 ORDER BY created_at DESC',
      [activityId]
    );
    return result.rows;
  },

  create: async (activityId, imagePath, caption) => {
    const result = await query(
      'INSERT INTO activity_images (activity_id, image_path, caption) VALUES ($1, $2, $3) RETURNING *',
      [activityId, imagePath, caption]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query('DELETE FROM activity_images WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  findById: async (id) => {
    const result = await query('SELECT * FROM activity_images WHERE id = $1', [id]);
    return result.rows[0];
  }
};

module.exports = ActivityImage;
