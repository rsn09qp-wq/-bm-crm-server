import Schedule from '../models/Schedule.js';
import Class from '../models/Class.js';
import Employee from '../models/Employee.js';

export const getScheduleByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const schedule = await Schedule.find({ classId }).sort({ day: 1, period: 1 });
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateScheduleEntry = async (req, res) => {
    try {
        const { classId, day, period, subject, teacherId, teacherName, room, startTime, endTime } = req.body;

        const cls = await Class.findById(classId);
        if (!cls) return res.status(404).json({ success: false, message: "Sinf topilmadi" });

        const filter = { classId, day, period };
        const update = {
            className: cls.name,
            subject,
            teacherId,
            teacherName,
            room,
            startTime,
            endTime
        };

        const entry = await Schedule.findOneAndUpdate(filter, update, {
            upsert: true,
            new: true,
            runValidators: true
        });

        res.json({ success: true, entry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const generateSmartSchedule = async (req, res) => {
    try {
        const { classId, subjectWeights } = req.body; // subjectWeights: { "Matematika": 6, "Fizika": 4 }

        const cls = await Class.findById(classId);
        if (!cls) return res.status(404).json({ success: false, message: "Sinf topilmadi" });

        // 1. Fetch all teachers
        const teachers = await Employee.find({ role: 'teacher', status: 'active' });

        // 2. Fetch all existing schedules to avoid collisions globally
        const globalSchedule = await Schedule.find({});

        // 3. Define 5 days (1-5) and 9 periods (1-9)
        const DAYS = [1, 2, 3, 4, 5];
        const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

        // 4. Create a pool of lessons to assign based on weights
        let lessonPool = [];
        for (const [subject, weight] of Object.entries(subjectWeights)) {
            for (let i = 0; i < weight; i++) {
                lessonPool.push(subject);
            }
        }

        // Shuffle lesson pool for randomness
        lessonPool.sort(() => Math.random() - 0.5);

        const newEntries = [];
        const usedSlots = new Set(); // To track slots already filled for THIS class

        // 5. Assignment Logic
        for (const subject of lessonPool) {
            let assigned = false;

            // Try to find a free slot for this lesson
            // We'll iterate through days and periods randomly to avoid clustering
            const shuffledDays = [...DAYS].sort(() => Math.random() - 0.5);
            const shuffledPeriods = [...PERIODS].sort(() => Math.random() - 0.5); // Use all periods

            for (const day of shuffledDays) {
                for (const period of shuffledPeriods) {
                    const slotKey = `${day}-${period}`;
                    if (usedSlots.has(slotKey)) continue;

                    // Find the assigned teacher for this subject in THIS class
                    const assignment = cls.subjectAssignments?.find(a => a.subject === subject);

                    if (assignment && assignment.teacherId) {
                        // Check if THIS specific assigned teacher is busy at this day/period globally
                        const isBusy = globalSchedule.some(s =>
                            s.day === day &&
                            s.period === period &&
                            s.teacherId && s.teacherId.toString() === assignment.teacherId.toString()
                        );

                        if (!isBusy) {
                            newEntries.push({
                                classId,
                                className: cls.name,
                                day,
                                period,
                                subject,
                                teacherId: assignment.teacherId,
                                teacherName: assignment.teacherName,
                                room: cls.roomNumber || "301",
                                startTime: "08:30",
                                endTime: "09:15"
                            });
                            usedSlots.add(slotKey);
                            assigned = true;
                            break;
                        }
                    } else {
                        // NO ASSIGNMENT for this subject in this class
                        // We still create the slot, but leave teacher empty as requested
                        // This allows the user to assign them later or ensures we don't pick a random one
                        newEntries.push({
                            classId,
                            className: cls.name,
                            day,
                            period,
                            subject,
                            teacherId: null,
                            teacherName: "",
                            room: cls.roomNumber || "301",
                            startTime: "08:30",
                            endTime: "09:15"
                        });
                        usedSlots.add(slotKey);
                        assigned = true;
                        break;
                    }
                }
                if (assigned) break;
            }
        }

        // 6. Save new entries (remove old ones first for this class)
        await Schedule.deleteMany({ classId });
        const createdEntries = await Schedule.insertMany(newEntries);

        res.json({ success: true, count: createdEntries.length, schedule: createdEntries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteScheduleEntry = async (req, res) => {
    try {
        const { id } = req.params;
        await Schedule.findByIdAndDelete(id);
        res.json({ success: true, message: "Dars o'chirildi" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTeacherSchedule = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const schedule = await Schedule.find({ teacherId }).sort({ day: 1, period: 1 });
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
