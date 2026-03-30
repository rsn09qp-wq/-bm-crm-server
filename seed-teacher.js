import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Employee from './models/Employee.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function seedTeacher() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Check if teacher user already exists
        const existingUser = await User.findOne({ username: 'teacher' });
        if (existingUser) {
            console.log('⚠️ Teacher user already exists');
            process.exit(0);
        }

        // Find a teacher employee to link to
        const teacherEmployee = await Employee.findOne({ role: 'teacher' });

        if (!teacherEmployee) {
            console.log('⚠️ No teacher employee found in database');
            console.log('Creating teacher user without employee link...');
        }

        // Create teacher user
        const teacherUser = new User({
            username: 'teacher',
            password: 'teacher123',
            email: 'teacher@bmmaktab.uz',
            fullName: 'Demo O\'qituvchi',
            role: 'teacher',
            employeeId: teacherEmployee?._id || null
        });

        await teacherUser.save();
        console.log('✅ Teacher user created successfully');
        console.log('Username: teacher');
        console.log('Password: teacher123');
        console.log('Role: teacher');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedTeacher();
