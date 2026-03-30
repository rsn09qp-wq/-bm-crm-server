import mongoose from 'mongoose';
import dotenv from 'dotenv';
import NotificationLog from './models/NotificationLog.js';

dotenv.config();

const checkStatus = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const lastLog = await NotificationLog.findOne({ target: 'student' }).sort({ sentAt: -1 });

        console.log("📍 Last Student Report Status:");
        if (lastLog) {
            console.log(`- Time: ${lastLog.sentAt}`);
            console.log(`- Status: ${lastLog.status}`);
            console.log(`- Message Time Snippet: ${lastLog.message.split('|').pop().trim()}`);
        } else {
            console.log("No logs found.");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkStatus();
