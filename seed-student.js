import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Employee from './models/Employee.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bm-crm';

async function recreateStudentUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Delete existing user if any
        await User.deleteOne({ username: "o'quvchi" });
        console.log('🗑️ Deleted existing user (if any)');

        // Find a student
        const student = await Employee.findOne({ role: 'student' });

        if (!student) {
            console.log('❌ No student found in Employee collection');
            await mongoose.disconnect();
            return;
        }

        console.log('✅ Found student:', student.name, '(ID:', student._id, ')');

        // Create fresh user
        const studentUser = new User({
            username: "o'quvchi",
            password: "student123",  // Will be hashed by pre-save hook
            email: student.email || "student@test.uz",
            fullName: student.name,
            role: 'student',
            studentId: student._id,
            isActive: true
        });

        await studentUser.save();
        console.log('✅ Student user created successfully!');

        // Verify password works
        const testUser = await User.findOne({ username: "o'quvchi" });
        const isPasswordValid = await testUser.comparePassword('student123');
        console.log('✅ Password verification:', isPasswordValid ? 'SUCCESS' : 'FAILED');

        console.log('\n📋 Login credentials:');
        console.log('Username: o\'quvchi');
        console.log('Password: student123');
        console.log('Linked to:', student.name);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

recreateStudentUser();
