const { query } = require('../config/db');

const Activity = {

  create: async (data, creatorId) => {
    const toInt = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = parseInt(val);
      return isNaN(parsed) ? null : parsed;
    };

    const toFloat = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    // 1. Get Agency and Type codes for Activity Code generation
    const agencyRes = await query('SELECT agency_code FROM agencies WHERE id = $1', [toInt(data.agencyId)]);
    const typeRes = await query('SELECT type_code FROM activity_types WHERE id = $1', [toInt(data.typeId)]);

    if (agencyRes.rows.length === 0 || typeRes.rows.length === 0) {
      throw new Error('ยังไม่ได้เลือกหน่วยงาน หรือประเภทกิจกรรม');
    }

    const agencyCode = agencyRes.rows[0].agency_code;
    const typeCode = typeRes.rows[0].type_code;
    const year2 = data.academicYear.toString().slice(-2);
    const semester = data.semester;

    // Prefix: Agency(4) + Year(2) + Semester(1) + Type(1)
    const prefix = `${agencyCode}${year2}${semester}${typeCode}`;

    // 2. Generate Sequence (00-99)
    // Use regex to ensure we only try to parse numeric sequence parts
    const seqRes = await query(
      `SELECT COALESCE(MAX(CASE 
        WHEN SUBSTRING(activity_code FROM 9 FOR 2) ~ '^[0-9]+$' 
        THEN SUBSTRING(activity_code FROM 9 FOR 2)::INTEGER 
        ELSE -1 
       END), -1) + 1 as next_seq 
       FROM activities 
       WHERE activity_code LIKE $1 || '%'`,
      [prefix]
    );

    const nextSeq = seqRes.rows[0].next_seq;
    if (nextSeq > 99) {
      throw new Error('Activity limit reached for this specific category and period (max 100)');
    }

    const activityCode = `${prefix}${nextSeq.toString().padStart(2, '0')}`;

    // 3. Insert Activity
    const activityResult = await query(
      `INSERT INTO activities (
          activity_code, academic_year, semester, agency_id, type_id, title, description, 
          location, activity_start, activity_end, registration_start, registration_end,
          hours, loaner_hours, credits, max_participants, budget_source_id, budget_requested, 
          status, publish_status, creator_id, last_updated_by, owner_faculty_code, cover_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) 
        RETURNING *`,
      [
        activityCode,
        toInt(data.academicYear),
        toInt(data.semester),
        toInt(data.agencyId),
        toInt(data.typeId),
        data.title,
        data.description,
        data.location,
        data.activityStart,
        data.activityEnd,
        data.registrationStart,
        data.registrationEnd,
        toFloat(data.hours),
        toFloat(data.loanerHours),
        toFloat(data.credits),
        toInt(data.maxParticipants),
        toInt(data.budgetSourceId),
        toFloat(data.budgetRequested),
        data.status || 'ขออนุมัติ',
        data.publishStatus || 'private',
        creatorId,
        creatorId,
        data.ownerFacultyCode,
        data.coverImage
      ]
    );

    const activity = activityResult.rows[0];

    // 4. Handle Skills (Many-to-Many)
    if (data.skills && Array.isArray(data.skills)) {
      for (const skillId of data.skills) {
        await query('INSERT INTO activity_skills (activity_id, skill_id) VALUES ($1, $2)', [activity.id, skillId]);
      }
    }

    // 5. Handle Faculty Restrictions (Many-to-Many)
    if (data.faculties && Array.isArray(data.faculties)) {
      for (const facultyCode of data.faculties) {
        await query('INSERT INTO activity_faculties (activity_id, faculty_code) VALUES ($1, $2)', [activity.id, facultyCode]);
      }
    }

    return activity;
  },

  findAll: async (filters = {}) => {
    console.log("findAll---------", filters);
    
    // Pagination parameters
    const limit = filters.limit ? parseInt(filters.limit) : null;
    const offset = filters.page ? (parseInt(filters.page) - 1) * (limit || 10) : 0;

    let sql = `
      SELECT a.*, ag.agency_name, at.type_name, u.username as creator_name, f.faculty_name as owner_faculty_name,
             (SELECT COUNT(*)::INTEGER FROM registrations r WHERE r.activity_id = a.id) as registered_count
      FROM activities a 
      LEFT JOIN agencies ag ON a.agency_id = ag.id
      LEFT JOIN activity_types at ON a.type_id = at.id
      LEFT JOIN userauth u ON a.creator_id = u.id
      LEFT JOIN faculties f ON a.owner_faculty_code = f.faculty_code
    `;
    const params = [];
    const whereClauses = [];

    if (filters.status && filters.status !== 'all') {
      whereClauses.push(`a.status = $${params.length + 1}`);
      params.push(filters.status);
    }

    if (filters.publishStatus && filters.publishStatus !== 'all') {
      whereClauses.push(`a.publish_status = $${params.length + 1}`);
      params.push(filters.publishStatus);
    }

    if (filters.facultyCode) {
      // Show if it belongs to faculty OR if no restriction exists in activity_faculties (open to all)
      // OR if it's explicitly allowed in activity_faculties
      whereClauses.push(`(
        a.owner_faculty_code = $${params.length + 1} OR 
        NOT EXISTS (SELECT 1 FROM activity_faculties af WHERE af.activity_id = a.id) OR
        EXISTS (SELECT 1 FROM activity_faculties af WHERE af.activity_id = a.id AND af.faculty_code = $${params.length + 1})
      )`);
      params.push(filters.facultyCode);
    }

    if (filters.ownerFacultyCode) {
      whereClauses.push(`a.owner_faculty_code = $${params.length + 1}`);
      params.push(filters.ownerFacultyCode);
    }

    if (filters.academicYear && filters.academicYear !== 'all') {
      whereClauses.push(`a.academic_year = $${params.length + 1}`);
      params.push(parseInt(filters.academicYear));
    }

    if (filters.semester && filters.semester !== 'all') {
      whereClauses.push(`a.semester = $${params.length + 1}`);
      params.push(parseInt(filters.semester));
    }

    if (filters.search) {
      whereClauses.push(`(a.title ILIKE $${params.length + 1} OR a.activity_code ILIKE $${params.length + 1})`);
      params.push(`%${filters.search}%`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Get total count BEFORE adding LIMIT and OFFSET
    const countSql = `SELECT COUNT(*) FROM (${sql}) as filtered_activities`;
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count);

    sql += ' ORDER BY a.created_at DESC';

    if (limit) {
      const limitParamIndex = params.length + 1;
      const offsetParamIndex = params.length + 2;
      sql += ` LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;
      params.push(limit, offset);
    }

    const result = await query(sql, params);
    return { rows: result.rows, total };
  },

  findById: async (id) => {
    const activityResult = await query(
      `SELECT a.*, ag.agency_name, at.type_name, bs.source_name as budget_source_name,
       (SELECT COUNT(*)::INTEGER FROM registrations r WHERE r.activity_id = a.id) as registered_count
       FROM activities a
       LEFT JOIN agencies ag ON a.agency_id = ag.id
       LEFT JOIN activity_types at ON a.type_id = at.id
       LEFT JOIN budget_sources bs ON a.budget_source_id = bs.id
       WHERE a.id = $1`,
      [id]
    );

    if (activityResult.rows.length === 0) return null;

    const activity = activityResult.rows[0];

    // Fetch Skills
    const skillsRes = await query(
      `SELECT s.* FROM skills s 
       JOIN activity_skills aski ON s.id = aski.skill_id 
       WHERE aski.activity_id = $1`,
      [id]
    );
    activity.skills = skillsRes.rows;

    // Fetch Faculty Restrictions
    const facultiesRes = await query(
      `SELECT f.* FROM faculties f 
       JOIN activity_faculties af ON f.faculty_code = af.faculty_code 
       WHERE af.activity_id = $1`,
      [id]
    );
    activity.allowed_faculties = facultiesRes.rows;

    // Fetch Attachments
    const attachmentsRes = await query(
      `SELECT * FROM activity_attachments WHERE activity_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    activity.attachments = attachmentsRes.rows;

    return activity;
  },

  addAttachment: async (activityId, attachmentData) => {
    const result = await query(
      `INSERT INTO activity_attachments (activity_id, file_path, file_name, display_name, is_published)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        activityId,
        attachmentData.filePath,
        attachmentData.fileName,
        attachmentData.displayName,
        attachmentData.isPublished !== undefined ? attachmentData.isPublished : true
      ]
    );
    return result.rows[0];
  },

  updateAttachmentVisibility: async (id, isPublished) => {
    const result = await query(
      'UPDATE activity_attachments SET is_published = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [isPublished, id]
    );
    return result.rows[0];
  },

  deleteAttachment: async (id) => {
    const result = await query('DELETE FROM activity_attachments WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  updateStatus: async (id, status, updaterId) => {
    const result = await query(
      'UPDATE activities SET status = $1, last_updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, updaterId, id]
    );
    return result.rows[0];
  },

  updateVisibility: async (id, publishStatus, updaterId) => {
    const result = await query(
      'UPDATE activities SET publish_status = $1, last_updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [publishStatus, updaterId, id]
    );
    return result.rows[0];
  },

  update: async (id, data, updaterId) => {
    const toInt = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = parseInt(val);
      return isNaN(parsed) ? null : parsed;
    };

    const toFloat = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    // 1. Update main activity table
    const result = await query(
      `UPDATE activities SET 
        academic_year = $1, semester = $2, agency_id = $3, type_id = $4,
        title = $5, description = $6, hours = $7, loaner_hours = $8, 
        credits = $9, max_participants = $10, location = $11,
        activity_start = $12, activity_end = $13, 
        registration_start = $14, registration_end = $15,
        budget_source_id = $16, budget_requested = $17,
        publish_status = $18, cover_image = COALESCE($19, cover_image),
        last_updated_by = $20, updated_at = CURRENT_TIMESTAMP
       WHERE id = $21 RETURNING *`,
      [
        toInt(data.academicYear),
        toInt(data.semester),
        toInt(data.agencyId),
        toInt(data.typeId),
        data.title,
        data.description,
        toFloat(data.hours),
        toFloat(data.loanerHours),
        toFloat(data.credits),
        toInt(data.maxParticipants),
        data.location,
        data.activityStart,
        data.activityEnd,
        data.registrationStart,
        data.registrationEnd,
        toInt(data.budgetSourceId),
        toFloat(data.budgetRequested),
        data.publishStatus,
        data.coverImage,
        updaterId,
        id
      ]
    );

    const activity = result.rows[0];

    // 2. Update Skills (Clear and Re-insert)
    if (data.skills && Array.isArray(data.skills)) {
      await query('DELETE FROM activity_skills WHERE activity_id = $1', [id]);
      for (const skillId of data.skills) {
        await query('INSERT INTO activity_skills (activity_id, skill_id) VALUES ($1, $2)', [id, skillId]);
      }
    }

    // 3. Update Faculty Restrictions (Clear and Re-insert)
    if (data.faculties && Array.isArray(data.faculties)) {
      await query('DELETE FROM activity_faculties WHERE activity_id = $1', [id]);
      for (const facultyCode of data.faculties) {
        await query('INSERT INTO activity_faculties (activity_id, faculty_code) VALUES ($1, $2)', [id, facultyCode]);
      }
    }

    return activity;
  },

  delete: async (id) => {
    await query('DELETE FROM activity_skills WHERE activity_id = $1', [id]);
    await query('DELETE FROM activity_faculties WHERE activity_id = $1', [id]);
    await query('DELETE FROM registrations WHERE activity_id = $1', [id]);
    const result = await query('DELETE FROM activities WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
};

module.exports = Activity;
