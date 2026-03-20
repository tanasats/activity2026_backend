const { query } = require('../config/db');

/**
 * Controller for Master Data (Agencies, Types, Skills, Budget Sources, Faculties)
 */
const masterDataController = {
  getAgencies: async (req, res) => {
    try {
      const result = await query('SELECT * FROM agencies ORDER BY agency_name ASC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getActivityTypes: async (req, res) => {
    try {
      const result = await query('SELECT * FROM activity_types ORDER BY type_code ASC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getSkills: async (req, res) => {
    try {
      const result = await query('SELECT * FROM skills ORDER BY skill_name ASC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getBudgetSources: async (req, res) => {
    try {
      const result = await query('SELECT * FROM budget_sources ORDER BY id ASC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getFaculties: async (req, res) => {
    try {
      const result = await query('SELECT faculty_code, faculty_name FROM faculties ORDER BY faculty_code ASC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = masterDataController;
