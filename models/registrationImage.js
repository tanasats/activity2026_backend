const { query } = require('../config/db');

const RegistrationImage = {
  create: async (registrationId, imagePath, caption = null) => {
    const result = await query(
      'INSERT INTO registration_images (registration_id, image_path, caption) VALUES ($1, $2, $3) RETURNING *',
      [registrationId, imagePath, caption]
    );
    return result.rows[0];
  },

  findByRegistrationId: async (registrationId) => {
    const result = await query(
      'SELECT * FROM registration_images WHERE registration_id = $1 ORDER BY created_at DESC',
      [registrationId]
    );
    return result.rows;
  },

  countByRegistrationId: async (registrationId) => {
    const result = await query(
      'SELECT COUNT(*) FROM registration_images WHERE registration_id = $1',
      [registrationId]
    );
    return parseInt(result.rows[0].count);
  },

  findById: async (id) => {
    const result = await query('SELECT * FROM registration_images WHERE id = $1', [id]);
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query('DELETE FROM registration_images WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

module.exports = RegistrationImage;
