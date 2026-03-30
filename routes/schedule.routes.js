import express from 'express';
import {
    getScheduleByClass,
    updateScheduleEntry,
    generateSmartSchedule,
    deleteScheduleEntry,
    getTeacherSchedule
} from '../controllers/schedule.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/class/:classId', getScheduleByClass);

router.use(authenticateToken);

router.get('/teacher/:teacherId', getTeacherSchedule);

// Only admins and directors can update schedule
router.post('/update', requireRole('admin', 'director'), updateScheduleEntry);
router.post('/generate-smart', requireRole('admin', 'director'), generateSmartSchedule);
router.delete('/:id', requireRole('admin', 'director'), deleteScheduleEntry);

export default router;
