import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bm-crm';

async function checkStudentUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ username: "o'quvchi" }).populate('studentId');

        if (!user) {
            console.log('❌ User not found!');
        } else {
            console.log('✅ User found:');
            console.log('Username:', user.username);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Full Name:', user.fullName);
            console.log('Is Active:', user.isActive);
            console.log('Student ID:', user.studentId);
            console.log('Has Password:', !!user.password);

            // Test password
            const isValid = await user.comparePassword('student123');
            console.log('Password "student123" is valid:', isValid);
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkStudentUser();
