import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

// 1. Get students in "1 blue"
const students = await db.collection('students').find({ className: '1 blue', status: 'active' }).project({ _id: 1, name: 1 }).toArray();
console.log(`\n=== Students in "1 blue": ${students.length} ===`);
students.forEach(s => console.log(`  ${s._id} - ${s.name}`));

// 2. Get grades for today
const today = new Date().toISOString().split('T')[0];
console.log(`\n=== Grades for date: ${today} ===`);
const studentIds = students.map(s => s._id);
const grades = await db.collection('grades').find({
    studentId: { $in: studentIds },
    date: today
}).toArray();
console.log(`Found ${grades.length} grades for "1 blue" on ${today}`);
grades.forEach(g => console.log(`  ${g.studentId} - ${g.subject}: ${g.value}`));

// 3. Check all grades dates for these students
const allGrades = await db.collection('grades').find({
    studentId: { $in: studentIds }
}).toArray();
console.log(`\n=== All grades for "1 blue" students: ${allGrades.length} ===`);
const dateMap = {};
allGrades.forEach(g => {
    dateMap[g.date] = (dateMap[g.date] || 0) + 1;
});
Object.entries(dateMap).sort().forEach(([d, c]) => console.log(`  ${d}: ${c} grades`));

// 4. Check a sample grade to see studentId type
if (allGrades.length > 0) {
    console.log('\n=== Sample grade studentId type ===');
    console.log('  Type:', typeof allGrades[0].studentId);
    console.log('  Value:', allGrades[0].studentId);
    console.log('  Student._id type:', typeof students[0]._id);
    console.log('  Student._id value:', students[0]._id);
    console.log('  Match?:', allGrades[0].studentId.toString() === students[0]._id.toString());
}

await mongoose.disconnect();
