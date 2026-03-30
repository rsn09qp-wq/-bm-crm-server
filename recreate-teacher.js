import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Employee from './models/Employee.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function recreateTeacher() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Delete existing teacher user
        const deleted = await User.deleteOne({ username: 'teacher' });
        console.log(`🗑️ Deleted ${deleted.deletedCount} teacher user(s)`);

        // Create new teacher user
        const teacherUser = new User({
            username: 'teacher',
            password: 'teacher123', // Hook handles hashing
            email: 'teacher@bmmaktab.uz',
            fullName: 'Demo O\'qituvchi',
            role: 'teacher'
        });

        await teacherUser.save();
        console.log('✅ Teacher user recreated successfully');
        console.log('Username: teacher');
        console.log('Password: teacher123');
        console.log('Role: teacher');
        console.log('Hashed Password:', hashedPassword);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

recreateTeacher();
