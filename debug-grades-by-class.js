import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const grades = await db.collection('grades').find({}).toArray();
const students = await db.collection('students').find({}).project({ _id: 1, className: 1 }).toArray();

const classMap = {};
grades.forEach(g => {
    const s = students.find(st => st._id.toString() === g.studentId.toString());
    const cls = s ? s.className : 'unknown';
    if (!classMap[cls]) classMap[cls] = {};
    classMap[cls][g.date] = (classMap[cls][g.date] || 0) + 1;
});

Object.entries(classMap).forEach(([cls, dates]) => {
    const total = Object.values(dates).reduce((a, b) => a + b, 0);
    console.log(`\n${cls} (${total} total grades):`);
    Object.entries(dates).sort().reverse().forEach(([d, n]) => {
        console.log(`  ${d}: ${n} grades`);
    });
});

await mongoose.disconnect();
