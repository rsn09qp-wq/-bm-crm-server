import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function checkAndFixTeacher() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        // Find teacher user
        const teacher = await User.findOne({ username: 'teacher' });

        if (!teacher) {
            console.log('❌ Teacher user not found!');
            console.log('Creating new teacher user...');
        } else {
            console.log('✅ Teacher user found:');
            console.log('  Username:', teacher.username);
            console.log('  Role:', teacher.role);
            console.log('  Email:', teacher.email);
            console.log('  Hashed Password:', teacher.password);

            // Test password
            const isMatch = await bcrypt.compare('teacher123', teacher.password);
            console.log('  Password test (teacher123):', isMatch ? '✅ MATCH' : '❌ NO MATCH');

            if (isMatch) {
                console.log('\n✅ Teacher user is correct! Login should work.');
                process.exit(0);
            }

            console.log('\n⚠️ Password does not match! Deleting and recreating...');
            await User.deleteOne({ username: 'teacher' });
        }

        // Create new teacher user
        const hashedPassword = await bcrypt.hash('teacher123', 10);
        const newTeacher = new User({
            username: 'teacher',
            password: hashedPassword,
            email: 'teacher@bmmaktab.uz',
            fullName: 'Demo O\'qituvchi',
            role: 'teacher'
        });

        await newTeacher.save();
        console.log('\n✅ New teacher user created!');
        console.log('  Username: teacher');
        console.log('  Password: teacher123');
        console.log('  Hashed:', hashedPassword);

        // Verify
        const verify = await bcrypt.compare('teacher123', hashedPassword);
        console.log('  Verification:', verify ? '✅ PASS' : '❌ FAIL');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAndFixTeacher();
