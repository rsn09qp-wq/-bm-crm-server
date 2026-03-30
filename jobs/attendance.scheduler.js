import cron from 'node-cron';
import notificationService from '../services/notification.service.js';

const TZ = 'Asia/Tashkent';

class AttendanceScheduler {
    constructor() {
        this.jobs = [];
    }

    // Start the scheduler (in-app notifications only)
    start() {
        // Morning in-app notification - 9:00 AM Tashkent
        const morningJob = cron.schedule('0 9 * * *', async () => {
            console.log('🔔 Running morning in-app attendance notification (09:00 Tashkent)...');
            try {
                const result = await notificationService.createDailyAttendanceNotification();
                if (result.success) {
                    console.log(`✅ Morning in-app notifications created: ${result.count}`);
                }
            } catch (error) {
                console.error('❌ Error in morning attendance scheduler:', error);
            }
        }, { scheduled: true, timezone: TZ });

        // Afternoon in-app notification - 16:50 Tashkent
        const afternoonJob = cron.schedule('50 16 * * *', async () => {
            console.log('🔔 Running afternoon in-app attendance notification (16:50 Tashkent)...');
            try {
                const today = new Date();
                const result = await notificationService.createDailyAttendanceNotification(today);
                if (result.success) {
                    console.log(`✅ Afternoon in-app notifications created: ${result.count}`);
                }
            } catch (error) {
                console.error('❌ Error in afternoon attendance scheduler:', error);
            }
        }, { scheduled: true, timezone: TZ });

        this.jobs = [morningJob, afternoonJob];

        console.log('📅 In-app attendance scheduler started (Asia/Tashkent):');
        console.log('   • 09:00 — Morning in-app notification');
        console.log('   • 16:50 — Afternoon in-app notification');
        console.log('   ℹ️  Telegram reports are handled by scheduler.service.js (10:00 & 17:00)');
    }

    // Stop all scheduled jobs
    stop() {
        this.jobs.forEach(job => job.stop());
        this.jobs = [];
        console.log('📅 Attendance scheduler stopped');
    }

    // Manually trigger the in-app job (for testing)
    async triggerNow() {
        console.log('🔔 Manually triggering attendance notification job...');
        try {
            const result = await notificationService.createDailyAttendanceNotification();
            return result;
        } catch (error) {
            console.error('❌ Error triggering attendance notification:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new AttendanceScheduler();
