import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from './db/connection.js';
import Class from './models/Class.js';
import Teacher from './models/Teacher.js';
import Schedule from './models/Schedule.js';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const dayMap = {
    'Dushanba': 1,
    'Seshanba': 2,
    'Chorshanba': 3,
    'Payshanba': 4,
    'Juma': 5,
    'Shanba': 6
};

const rawData = {
    "class": "1 blue",
    "schedule": [
        {
            "lesson": 1,
            "time": "08:30-09:15",
            "Dushanba": { "subject": "Kelajak soati", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Seshanba": { "subject": "Rus tili", "teacher": "ERGASHEVA SHIRIN" },
            "Chorshanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Payshanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Juma": { "subject": "Rus tili", "teacher": "ERGASHEVA SHIRIN" }
        },
        {
            "lesson": 2,
            "time": "09:20-10:05",
            "Dushanba": { "subject": "Ingliz tili", "teacher": "ABDULLAJONOV ILHOMJON" },
            "Seshanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Chorshanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Payshanba": { "subject": "Ingliz tili", "teacher": "ABDULLAJONOV ILHOMJON" },
            "Juma": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" }
        },
        {
            "lesson": 3,
            "time": "10:10-10:55",
            "Dushanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Seshanba": { "subject": "Informatika", "teacher": "QURBONOV IKROMJON" },
            "Chorshanba": { "subject": "Ingliz tili", "teacher": "ABDULLAJONOV ILHOMJON" },
            "Payshanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Juma": { "subject": "Ingliz tili", "teacher": "ABDULLAJONOV ILHOMJON" }
        },
        {
            "lesson": 4,
            "time": "11:00-11:45",
            "Dushanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Seshanba": { "subject": "Ingliz tili", "teacher": "ABDULLAJONOV ILHOMJON" },
            "Chorshanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Payshanba": { "subject": "Mental", "teacher": "ARTIKOVA MAFTUNA" },
            "Juma": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" }
        },
        {
            "lesson": 5,
            "time": "11:50-12:30",
            "Dushanba": { "subject": "Shaxmat", "teacher": "QOBILOVA GULMIRA" },
            "Seshanba": { "subject": "Ingliz tili", "teacher": "ABDULLAJONOV ILHOMJON" },
            "Chorshanba": { "subject": "J.Tarbiya", "teacher": "TURG'UNBOYEVA IRODA" },
            "Payshanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Juma": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" }
        },
        {
            "lesson": 6,
            "time": "13:15-13:55",
            "Dushanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Seshanba": { "subject": "Tabiiy", "teacher": "ABBOSOVA SHAHNOZA" },
            "Chorshanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Payshanba": { "subject": "Mental", "teacher": "ARTIKOVA MAFTUNA" },
            "Juma": { "subject": null, "teacher": null }
        },
        {
            "lesson": 7,
            "time": "14:00-14:40",
            "Dushanba": { "subject": "Informatika", "teacher": "QURBONOV IKROMJON" },
            "Seshanba": { "subject": "Rus tili", "teacher": "ERGASHEVA SHIRIN" },
            "Chorshanba": { "subject": "Robotatexnika", "teacher": "ARTIKOVA MAFTUNA" },
            "Payshanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Juma": { "subject": null, "teacher": null }
        },
        {
            "lesson": 8,
            "time": "14:45-15:25",
            "Dushanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Seshanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Chorshanba": { "subject": "Robotatexnika", "teacher": "ARTIKOVA MAFTUNA" },
            "Payshanba": { "subject": "Rus tili", "teacher": "ERGASHEVA SHIRIN" },
            "Juma": { "subject": null, "teacher": null }
        },
        {
            "lesson": 9,
            "time": "15:55-16:35",
            "Dushanba": { "subject": "Rus tili", "teacher": "ERGASHEVA SHIRIN" },
            "Seshanba": { "subject": "Matematika", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Chorshanba": { "subject": "Rus tili", "teacher": "ERGASHEVA SHIRIN" },
            "Payshanba": { "subject": "Ona tili va o'qish savod.", "teacher": "MRAHMEDOVA MUAZZAM" },
            "Juma": { "subject": null, "teacher": null }
        }
    ]
};

const importSchedule = async () => {
    try {
        await connectDB();
        console.log('📦 Connected to MongoDB');

        // 1. Find or Create Class
        let targetClass = await Class.findOne({
            name: { $regex: new RegExp(`^${rawData.class}$`, 'i') }
        });

        if (!targetClass) {
            console.log(`⚠️ Class '${rawData.class}' not found. Creating...`);
            targetClass = await Class.create({
                name: rawData.class,
                grade: 1,
                section: 'Blue', // Guessing from name
                academicYear: '2024-2025'
            });
            console.log(`✅ Created class: ${targetClass.name}`);
        } else {
            console.log(`✅ Found class: ${targetClass.name}`);
        }

        // 2. Clear existing schedule for this class
        await Schedule.deleteMany({ classId: targetClass._id });
        console.log('🧹 Cleared existing schedule for this class');

        // 3. Import new schedule
        let count = 0;
        for (const item of rawData.schedule) {
            const [startTime, endTime] = item.time.split('-');
            const period = item.lesson;

            for (const [dayName, dayData] of Object.entries(item)) {
                if (['lesson', 'time'].includes(dayName)) continue;
                if (!dayData.subject) continue; // Skip empty slots

                const dayNum = dayMap[dayName];
                if (!dayNum) continue;

                // Find teacher
                let teacher = null;
                if (dayData.teacher) {
                    teacher = await Teacher.findOne({
                        name: { $regex: new RegExp(dayData.teacher, 'i') }
                    });

                    if (!teacher) {
                        console.log(`⚠️ Teacher '${dayData.teacher}' not found. Creating placeholder...`);
                        // We need an employeeID. Let's create a random one or find max.
                        // Ideally we should fail or use existing mechanism, but for speed we create.
                        const lastTeacher = await Teacher.findOne().sort({ employeeId: -1 });
                        const newId = (lastTeacher?.employeeId || 1000) + 1;

                        teacher = await Teacher.create({
                            name: dayData.teacher,
                            subject: dayData.subject,
                            employeeId: newId,
                            hikvisionEmployeeId: 'TEMP_' + newId, // Create unique ID
                            status: 'active'
                        });
                        console.log(`✅ Created teacher: ${teacher.name}`);
                    }
                }

                await Schedule.create({
                    classId: targetClass._id,
                    className: targetClass.name,
                    day: dayNum,
                    period: period,
                    subject: dayData.subject,
                    teacherId: teacher ? teacher._id : null,
                    teacherName: teacher ? teacher.name : (dayData.teacher || 'Unassigned'),
                    startTime,
                    endTime
                });
                count++;
            }
        }

        console.log(`🎉 Successfully imported ${count} schedule entries for ${targetClass.name}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
};

importSchedule();
