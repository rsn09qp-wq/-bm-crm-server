import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from './models/Attendance.js';
import Student from './models/Student.js';

dotenv.config();

async function checkDataInconsistencies() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Check for student attendance records without names or IDs
        const problematicAttendance = await Attendance.find({
            role: 'student',
            $or: [
                { name: { $exists: false } },
                { name: '' },
                { name: null },
                { hikvisionEmployeeId: { $exists: false } },
                { hikvisionEmployeeId: '' },
                { hikvisionEmployeeId: null }
            ]
        });

        console.log(`\n🔍 Found ${problematicAttendance.length} problematic Attendance records`);
        problematicAttendance.forEach((r, i) => {
            if (i < 5) console.log(`  - Record ${r._id}: name=${r.name}, id=${r.hikvisionEmployeeId}, date=${r.date}`);
        });

        // 2. Check for Top Students calculation logic
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const startOfMonthStr = new Date(year, month, 1).toISOString().split('T')[0];
        const endOfMonthStr = new Date(year, month + 1, 0).toISOString().split('T')[0];

        const recentMonthly = await Attendance.find({
            date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
            role: 'student',
            $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
        }).limit(1000);

        console.log(`\n📊 Analyzing ${recentMonthly.length} recent monthly records for student stats...`);

        const studentStats = {};
        recentMonthly.forEach(r => {
            if (!r.hikvisionEmployeeId) {
                console.warn(`⚠️ Record ${r._id} missing hikvisionEmployeeId!`);
                return;
            }
            if (!studentStats[r.hikvisionEmployeeId]) {
                studentStats[r.hikvisionEmployeeId] = { name: r.name, class: r.department, count: 0 };
            }
            studentStats[r.hikvisionEmployeeId].count++;
        });

        const topStudents = Object.values(studentStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        console.log('\n🌟 Potential Top Students:');
        topStudents.forEach(s => {
            console.log(`  - ${s.name} (${s.class}): ${s.count} days`);
            if (!s.name) console.error('❌ ERROR: Student name is missing!');
        });

        await mongoose.connection.close();
        console.log('\n✅ Check completed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkDataInconsistencies();
