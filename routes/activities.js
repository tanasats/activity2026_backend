const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
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
// Officer/Admin: Attachment management
router.patch('/attachments/:attachmentId/visibility',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.updateAttachmentVisibility
);

router.delete('/attachments/:attachmentId',
  authenticateToken,
  authorizeRoles('officer', 'admin', 'superadmin'),
  activityController.deleteAttachment
);

// Student: Register for activity
router.post('/:id/register', 
  authenticateToken, 
  authorizeRoles('student'), 
  activityController.registerActivity
);

module.exports = router;
