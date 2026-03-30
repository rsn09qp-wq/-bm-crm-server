import express from 'express';
import notificationService from '../services/notification.service.js';
import attendanceScheduler from '../jobs/attendance.scheduler.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendAttendanceReport, sendClassAttendanceReport, sendCustomMessage } from '../services/telegram-core.service.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// ==================== IN-APP NOTIFICATIONS ====================

// Get user's notifications (paginated)
router.get('/', async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await notificationService.getUserNotifications(userId, page, limit);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await notificationService.getUnreadCount(userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const userId = req.user._id;
        const notificationId = req.params.id;

        const result = await notificationService.markAsRead(notificationId, userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await notificationService.markAllAsRead(userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user._id;
        const notificationId = req.params.id;

        const result = await notificationService.deleteNotification(notificationId, userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== TELEGRAM NOTIFICATIONS ====================

/**
 * GET /api/notifications/telegram/status
 * Check if Telegram Bot is configured
 */
router.get('/telegram/status', (req, res) => {
    const isConfigured = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;

    res.json({
        active: isConfigured && hasChatId,
        botConfigured: isConfigured,
        chatIdSet: hasChatId
    });
});

/**
 * POST /api/notifications/telegram/attendance
 * Manually trigger a Telegram attendance report
 */
router.post('/telegram/attendance', async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        const result = await sendAttendanceReport(role);

        if (result.success) {
            res.json({
                message: `${role === 'student' ? 'O\'quvchilar' : 'O\'qituvchilar'} davomat hisoboti Telegramga yuborildi`,
                stats: result
            });
        } else {
            res.status(500).json({ error: result.error || 'Failed to send report' });
        }
    } catch (error) {
        console.error('Error in manual telegram trigger:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/telegram/class-attendance
 * Manually trigger a Telegram attendance report for a specific class
 */
router.post('/telegram/class-attendance', async (req, res) => {
    try {
        const { className } = req.body;
        if (!className) {
            return res.status(400).json({ error: 'Sinf nomi kiritilishi shart' });
        }

        const result = await sendClassAttendanceReport(className);

        if (result.success) {
            res.json({
                message: `${className} sinfi davomat hisoboti Telegramga yuborildi`,
                stats: result
            });
        } else {
            res.status(500).json({ error: result.error || 'Failed to send report' });
        }
    } catch (error) {
        console.error('Error in manual class telegram trigger:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/telegram/custom
 * Send custom message/announcement to Telegram
 */
router.post('/telegram/custom', async (req, res) => {
    try {
        const { title, message, recipient } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Sarlavha va xabar matni kiritilishi shart' });
        }

        const result = await sendCustomMessage(title, message, recipient || 'Barcha');

        if (result.success) {
            res.json({
                message: 'Xabar Telegramga yuborildi',
                stats: result
            });
        } else {
            res.status(500).json({ error: result.error || 'Failed to send message' });
        }
    } catch (error) {
        console.error('Error sending custom message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/history
 * Get notification history with pagination
 */
router.get('/history', async (req, res) => {
    try {
        const { limit = 10, type, category } = req.query;

        const query = {};
        if (type) query.type = type;
        if (category) query.category = category;

        const NotificationLog = (await import('../models/NotificationLog.js')).default;

        const notifications = await NotificationLog.find(query)
            .sort({ sentAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error('Error fetching notification history:', error);
        res.status(500).json({ error: 'Failed to fetch notification history' });
    }
});

// Manual trigger for testing (admin only)
router.post('/trigger-attendance', async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const result = await attendanceScheduler.triggerNow();
        res.json(result);
    } catch (error) {
        console.error('Error triggering attendance notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;

