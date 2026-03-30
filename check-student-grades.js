import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Grade from './models/Grade.js';
import Student from './models/Student.js';

dotenv.config();

async function checkGrades() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        
        // Find the student
        const student = await Student.findOne({ name: /Olimjonova Mubina/i });
        if (!student) {
            console.log("Student not found");
            process.exit();
        }
        
        console.log(`Student: ${student.name} (${student.className})`);
        
        const days = 7;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split('T')[0];
        
        console.log(`Querying grades since: ${sinceStr}`);
        
        const grades = await Grade.find({ 
            studentId: student._id,
            date: { $gte: sinceStr } 
        }).sort({ date: 1 }).lean();
        
        let totalScore = 0;
        const SCORE_MAP = { green: 5, yellow: 4, red: 2 };
        
        grades.forEach(g => {
            const score = SCORE_MAP[g.status] || 0;
            console.log(`- Date: ${g.date}, Subject: ${g.subject}, Status: ${g.status}, Score: ${score}`);
            totalScore += score;
        });
        
        console.log(`\nTotal calculated score: ${totalScore}`);
        console.log(`Number of grades: ${grades.length}`);
        
        let avg = grades.length > 0 ? (totalScore / grades.length) : 0;
        console.log(`Average: ${avg.toFixed(2)}`);
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkGrades();
