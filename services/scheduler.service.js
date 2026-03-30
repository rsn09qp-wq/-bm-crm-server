import cron from 'node-cron';
import { sendAttendanceReport } from './telegram-core.service.js';

// Always use Asia/Tashkent timezone (UTC+5)
const TZ = 'Asia/Tashkent';

/**
 * Initialize all scheduled Telegram tasks (cron jobs)
 * Times are in Asia/Tashkent (UTC+5):
 *   10:00 — Morning attendance report (students + teachers)
 *   17:00 — End-of-day attendance report (students + teachers + staff)
 */
export const initializeScheduler = () => {
    console.log('⏰ Scheduler initialized (Asia/Tashkent timezone)');

    // 1. Morning Report - 10:00 AM Tashkent
    cron.schedule('0 10 * * *', async () => {
        console.log('🕒 Triggering Morning Attendance Report (10:00 Tashkent)...');
        await sendAttendanceReport('student');
        await sendAttendanceReport('teacher');
    }, {
        scheduled: true,
        timezone: TZ
    });

    // 2. Evening Report - 17:00 Tashkent
    cron.schedule('0 17 * * *', async () => {
        console.log('🕒 Triggering Evening Attendance Report (17:00 Tashkent)...');
        await sendAttendanceReport('student');
        await sendAttendanceReport('teacher');
        await sendAttendanceReport('staff');
    }, {
        scheduled: true,
        timezone: TZ
    });
};

export default initializeScheduler;
