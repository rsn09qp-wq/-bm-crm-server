import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db';

/**
 * Default admin user yaratish
 */
async function createDefaultAdmin() {
    try {
        // MongoDB'ga ulanish
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        // List of users to create/update
        const demoUsers = [
            {
                username: 'admin',
                password: 'admin123',
                email: 'admin@bmcrm.uz',
                fullName: 'System Administrator',
                role: 'admin'
            },
            {
                username: 'teacher',
                password: 'teacher123',
                email: 'teacher@bmcrm.uz',
                fullName: 'O\'qituvchi',
                role: 'teacher'
            },
            {
                username: 'director',
                password: 'director123',
                email: 'director@bmcrm.uz',
                fullName: 'Direktor',
                role: 'admin'
            }
        ];

        console.log('🔄 Checking/Creating demo users...');

        for (const userData of demoUsers) {
            const existingUser = await User.findOne({ username: userData.username });

            if (existingUser) {
                console.log(`ℹ️  User '${userData.username}' allaqachon mavjud. Parolni yangilaymiz...`);
                existingUser.password = userData.password;
                await existingUser.save();
                console.log(`✅ User '${userData.username}' paroli yangilandi!`);
            } else {
                console.log(`🆕 User '${userData.username}' yaratilmoqda...`);
                const newUser = new User(userData);
                await newUser.save();
                console.log(`✅ User '${userData.username}' yaratildi!`);
            }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Barcha foydalanuvchilar tayyor:');
        demoUsers.forEach((u, i) => {
            console.log(`${i + 1}. ${u.username} / ${u.password} (${u.role})`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Xato:', error.message);
        process.exit(1);
    }
}

createDefaultAdmin();;
