const { query } = require('../config/db');

const User = {
  create: async (email, username, profileImage, role, facultyCode = null, firstname = null, lastname = null) => {
    const result = await query(
      'INSERT INTO userauth (email, username, profile_image, role, faculty_code, firstname, lastname) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [email, username, profileImage, role, facultyCode, firstname, lastname]
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
  updateProfile: async (id, { username, firstname, lastname, profileImage }) => {
    const result = await query(
      `UPDATE userauth SET 
        username = COALESCE($1, username), 
        firstname = COALESCE($2, firstname),
        lastname = COALESCE($3, lastname),
        profile_image = COALESCE($4, profile_image),
        updatedat = CURRENT_TIMESTAMP 
       WHERE id = $5 RETURNING *`,
      [username, firstname, lastname, profileImage, id]
    );
    return result.rows[0];
  },
  findAll: async ({ search, role, facultyCode, limit = 10, offset = 0 }) => {
    let whereClause = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause.push(`(u.email ILIKE $${paramIndex} OR u.firstname ILIKE $${paramIndex} OR u.lastname ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereClause.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (facultyCode) {
      whereClause.push(`u.faculty_code = $${paramIndex}`);
      params.push(facultyCode);
      paramIndex++;
    }

    const whereString = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM userauth u ${whereString}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Get paginated data
    params.push(limit, offset);
    const dataResult = await query(
      `SELECT u.*, f.faculty_name 
       FROM userauth u 
       LEFT JOIN faculties f ON u.faculty_code = f.faculty_code 
       ${whereString} 
       ORDER BY u.createdat DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      users: dataResult.rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    };
  },
  adminUpdate: async (id, { role, faculty_code, username, firstname, lastname }) => {
    const result = await query(
      `UPDATE userauth SET 
        role = COALESCE($1, role), 
        faculty_code = COALESCE($2, faculty_code),
        username = COALESCE($3, username),
        firstname = COALESCE($4, firstname),
        lastname = COALESCE($5, lastname),
        updatedat = CURRENT_TIMESTAMP 
       WHERE id = $6 RETURNING *`,
      [role, faculty_code, username, firstname, lastname, id]
    );
    return result.rows[0];
  },
  delete: async (id) => {
    const result = await query('DELETE FROM userauth WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

module.exports = User;
