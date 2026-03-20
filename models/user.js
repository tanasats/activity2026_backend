const { query } = require('../config/db');

const User = {
  create: async (email, username, profileImage, role, facultyCode = null) => {
    const result = await query(
      'INSERT INTO userauth (email, username, profile_image, role, faculty_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, username, profileImage, role, facultyCode]
    );
    return result.rows[0];
  },
  findByEmail: async (email) => {
    const result = await query(
      `SELECT u.*, f.faculty_name 
       FROM userauth u 
       LEFT JOIN faculties f ON u.faculty_code = f.faculty_code 
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0];
  },
  updateProfile: async (id, username, profileImage, facultyCode = null) => {
    const result = await query(
      'UPDATE userauth SET username = $1, profile_image = $2, faculty_code = $3, updatedat = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [username, profileImage, facultyCode, id]
    );
    return result.rows[0];
  }
};

module.exports = User;
