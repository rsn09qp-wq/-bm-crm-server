import mongoose from 'mongoose';
import 'dotenv/config';
import { sendAttendanceReport } from './services/telegram-core.service.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function triggerReport() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        console.log('🚀 Triggering manual Teacher attendance report...');
        const result = await sendAttendanceReport('teacher');

        console.log('✅ Report process result:', JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('🔥 Error:', error);
        process.exit(1);
    }
}

triggerReport();
