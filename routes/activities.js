const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const registrationManagementController = require('../controllers/registrationManagementController');
const activityImageController = require('../controllers/activityImageController');
const exportController = require('../controllers/exportController');
const registrationImageController = require('../controllers/registrationImageController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public: Get all active activities
router.get('/', activityController.getPublicActivities);

// Officer/Admin: Get all activities for management
router.get('/manage', 
  authenticateToken, 
  authorizeRoles('officer', 'admin', 'superadmin'), 
  activityController.getManageActivities
);

// Officer/Admin: Get specific activity detail (Authenticated)
router.get('/:id', 
  authenticateToken,
  activityController.getActivityById
);

// Officer: Create activity
router.post('/', 
  authenticateToken, 
  authorizeRoles('officer', 'admin', 'superadmin'), 
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'attachments', maxCount: 10 }
  ]),
  activityController.createActivity
);

// Officer/Admin: Update activity
router.put('/:id',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'attachments', maxCount: 10 }
  ]),
  activityController.updateActivity
);

// Officer/Admin: Delete activity
router.delete('/:id',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.deleteActivity
);

// Admin: Approve activity
router.patch('/:id/approve', 
  authenticateToken, 
  authorizeRoles('admin', 'superadmin'), 
  activityController.approveActivity
);

// Officer/Admin: Update activity visibility
router.patch('/:id/visibility',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.updateVisibility
);

// Officer/Admin: Update activity status
router.patch('/:id/status',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.changeStatus
);
// Officer/Admin: Attachment management
router.patch('/attachments/:attachmentId/visibility',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.updateAttachmentVisibility
);

router.patch('/attachments/:attachmentId',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.updateAttachment
);

router.delete('/attachments/:attachmentId',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.deleteAttachment
);

// --- Activity Dashboard Management ---

// 1. Participant Management
router.get('/:activityId/participants',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  registrationManagementController.getParticipants
);

router.patch('/participants/:registrationId/status',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  registrationManagementController.updateParticipantStatus
);

router.get('/registrations/:registrationId',
  authenticateToken,
  registrationManagementController.getRegistrationDetail
);

router.post('/:activityId/check-in',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  registrationManagementController.checkInByHash
);

// --- Student Registration Images (Evidence) ---
router.get('/registrations/:registrationId/images',
  authenticateToken,
  registrationImageController.getImages
);

router.post('/registrations/:registrationId/images',
  authenticateToken,
  upload.single('image'),
  registrationImageController.uploadImage
);

router.delete('/registrations/images/:imageId',
  authenticateToken,
  registrationImageController.deleteImage
);

// 2. Excel Export
router.get('/:activityId/participants/export',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  exportController.exportParticipantsExcel
);

// 3. Activity Images (Evidence)
router.get('/:activityId/images',
  authenticateToken,
  activityImageController.getImages
);

router.post('/:activityId/images',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  upload.single('image'),
  activityImageController.uploadImage
);

router.delete('/images/:imageId',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityImageController.deleteImage
);

// Student: Register for activity
router.post('/:id/register', 
  authenticateToken, 
  authorizeRoles('student'), 
  activityController.registerActivity
);

module.exports = router;
