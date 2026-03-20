const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');

router.get('/agencies', masterDataController.getAgencies);
router.get('/types', masterDataController.getActivityTypes);
router.get('/skills', masterDataController.getSkills);
router.get('/budget-sources', masterDataController.getBudgetSources);
router.get('/faculties', masterDataController.getFaculties);

module.exports = router;
