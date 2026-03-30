import mongoose from 'mongoose';
import User from './models/User.js';
import Grade from './models/Grade.js';
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}, 'username role').lean();
    console.log('--- Users ---');
    users.forEach(u => console.log(`${u.username}: ${u.role}`));

    const grades = await Grade.find({}).limit(10).populate('teacherId', 'username').lean();
    console.log('\n--- Sample Grades ---');
    grades.forEach(g => {
        console.log(`Grade: ${g.status}, Teacher: ${g.teacherId?.username || 'Unknown'}`);
    });

    process.exit(0);
}

diagnose();
