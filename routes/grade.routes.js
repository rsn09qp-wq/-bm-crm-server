import express from 'express';
import { saveGrade, getStudentGrades, getTeacherGrades, updateGrade, deleteGrade, getGradesByClass, saveBulkGrades, getRankings, getAIInsights } from '../controllers/grade.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Rankings & Gamification
router.get(
    '/rankings',
    authenticateToken,
    getRankings
);

// AI Insights & Reports
router.get(
    '/ai-insights',
    authenticateToken,
    requireRole('teacher', 'admin', 'director'),
    getAIInsights
);

// Save new grade - Only teachers can grade
router.post(
    '/',
    authenticateToken,
    requireRole('teacher', 'admin'),
    saveGrade
);

// Save bulk grades
router.post(
    '/bulk',
    authenticateToken,
    requireRole('teacher', 'admin'),
    saveBulkGrades
);

// Get grades for a specific student
router.get(
    '/student/:studentId',
    authenticateToken,
    getStudentGrades
);

// Get grades by class - For grid view (Public for Kundalik)
router.get(
    '/by-class',
    getGradesByClass
);

// Get recent grades given by this teacher
router.get(
    '/my-grades',
    authenticateToken,
    requireRole('teacher', 'admin'),
    getTeacherGrades
);

// Update a grade
router.put(
    '/:id',
    authenticateToken,
    requireRole('teacher', 'admin'),
    updateGrade
);

// Delete a grade
router.delete(
    '/:id',
    authenticateToken,
    requireRole('teacher', 'admin'),
    deleteGrade
);

export default router;
