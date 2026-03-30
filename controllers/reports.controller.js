import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';
import Grade from '../models/Grade.js';

// Simple in-memory cache for report stats
let statsCache = {
    data: null,
    lastUpdated: 0
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getReportStats = async (req, res) => {
    try {
        console.log('📊 [REPORTS API] Request received');

        // Check cache first
        const now = new Date();
        if (statsCache.data && (now.getTime() - statsCache.lastUpdated < CACHE_DURATION)) {
            console.log('⚡ [REPORTS API] Returning cached data');
            return res.json(statsCache.data);
        }

        const year = now.getFullYear();
        const month = now.getMonth();
        const dayOfMonth = now.getDate();
        const todayStr = now.toISOString().split('T')[0];

        // Core counts
        const totalStudents = await Student.countDocuments({ status: 'active' });

        const startOfMonthStr = new Date(year, month, 1).toISOString().split('T')[0];
        const endOfMonthStr = new Date(year, month + 1, 0).toISOString().split('T')[0];

        // Statistics calculations
        const monthlyStatsAgg = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
                    role: 'student'
                }
            },
            {
                $group: {
                    _id: null,
                    presentCount: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ["$status", "present"] }, { $gt: [{ $strLenCP: { $ifNull: ["$firstCheckIn", ""] } }, 0] }] },
                                1, 0
                            ]
                        }
                    }
                }
            }
        ]);

        const presentCount = monthlyStatsAgg.length > 0 ? monthlyStatsAgg[0].presentCount : 0;
        const possibleCount = (totalStudents || 0) * dayOfMonth;
        const avgAttendance = possibleCount > 0 ? (presentCount / possibleCount) * 100 : 0;

        // Today stats
        const todayStatsAgg = await Attendance.aggregate([
            { $match: { date: todayStr, role: 'student' } },
            {
                $group: {
                    _id: null,
                    present: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ["$status", "present"] }, { $gt: [{ $strLenCP: { $ifNull: ["$firstCheckIn", ""] } }, 0] }] },
                                1, 0
                            ]
                        }
                    },
                    late: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: [{ $strLenCP: { $ifNull: ["$firstCheckIn", ""] } }, 0] },
                                        {
                                            $let: {
                                                vars: {
                                                    timeParts: { $split: ["$firstCheckIn", ":"] }
                                                },
                                                in: {
                                                    $gt: [
                                                        { $add: [{ $multiply: [{ $toInt: { $arrayElemAt: ["$$timeParts", 0] } }, 60] }, { $toInt: { $arrayElemAt: ["$$timeParts", 1] } }] },
                                                        (8 * 60 + 30)
                                                    ]
                                                }
                                            }
                                        }
                                    ]
                                },
                                1, 0
                            ]
                        }
                    }
                }
            }
        ]);

        const presentToday = todayStatsAgg.length > 0 ? todayStatsAgg[0].present : 0;
        const lateToday = todayStatsAgg.length > 0 ? todayStatsAgg[0].late : 0;
        const absentToday = Math.max(0, (totalStudents || 0) - presentToday);

        const attendanceDistribution = [
            { name: "Keldi", value: Math.max(0, presentToday - lateToday), color: "#22c55e" },
            { name: "Kech", value: lateToday, color: "#f59e0b" },
            { name: "Yo'q", value: absentToday, color: "#ef4444" },
        ];

        // Monthly Trend Data (Refactored to single aggregation)
        const tenMonthsAgo = new Date(year, month - 9, 1).toISOString().split('T')[0];
        const monthlyTrendAgg = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: tenMonthsAgo, $lte: endOfMonthStr },
                    role: 'student',
                    $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
                }
            },
            {
                $group: {
                    _id: { $substr: ["$date", 0, 7] }, // YYYY-MM
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const monthlyTrendMap = {};
        monthlyTrendAgg.forEach(item => {
            monthlyTrendMap[item._id] = item.count;
        });

        const monthlyTrend = [];
        const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
        for (let i = 9; i >= 0; i--) {
            const d = new Date(year, month - i, 1);
            const dLabel = monthNames[d.getMonth()];
            const monthKey = d.toISOString().split('T')[0].substring(0, 7);

            const mCount = monthlyTrendMap[monthKey] || 0;
            const mRate = totalStudents > 0 ? (mCount / (totalStudents * 22)) * 100 : 0;
            monthlyTrend.push({ month: dLabel, attendance: parseFloat(Math.min(100, mRate).toFixed(1)) });
        }

        // Class Performance (optimized aggregation)
        const classPerformance = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
                    role: 'student',
                    $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
                }
            },
            {
                $group: {
                    _id: "$department",
                    count: { $sum: 1 }
                }
            }
        ]);

        const classes = await Class.find({ status: 'active' });
        const classPerfMap = {};
        classPerformance.forEach(p => {
            if (p._id) classPerfMap[p._id] = p.count;
        });

        const formattedClassPerf = classes.map(cls => {
            const count = classPerfMap[cls.name] || 0;
            const rate = cls.studentCount > 0 ? (count / (cls.studentCount * dayOfMonth)) * 100 : 0;
            return { class: cls.name, attendance: parseFloat(Math.min(100, rate).toFixed(1)) };
        }).sort((a, b) => b.attendance - a.attendance).slice(0, 6);

        // Weekly Trend
        const weeklyTrendData = [];
        const weekLabels = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
        const temp = new Date();
        const dayIdx = temp.getDay();
        const diff = (dayIdx === 0 ? -6 : 1) - dayIdx;
        for (let i = 0; i < 6; i++) {
            const tDate = new Date();
            tDate.setDate(temp.getDate() + diff + i);
            const lDate = new Date(tDate);
            lDate.setDate(lDate.getDate() - 7);

            const tStr = tDate.toISOString().split('T')[0];
            const lStr = lDate.toISOString().split('T')[0];

            const tCount = await Attendance.countDocuments({ date: tStr, role: 'student', $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });
            const lCount = await Attendance.countDocuments({ date: lStr, role: 'student', $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });

            weeklyTrendData.push({
                day: weekLabels[i],
                thisWeek: totalStudents > 0 ? parseFloat(Math.min(100, (tCount / totalStudents) * 100).toFixed(1)) : 0,
                lastWeek: totalStudents > 0 ? parseFloat(Math.min(100, (lCount / totalStudents) * 100).toFixed(1)) : 0
            });
        }

        // Top Students
        const topStudentsAgg = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
                    role: 'student',
                    $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
                }
            },
            {
                $group: {
                    _id: "$hikvisionEmployeeId",
                    name: { $first: "$name" },
                    className: { $first: "$department" },
                    days: { $sum: 1 }
                }
            },
            { $sort: { days: -1 } },
            { $limit: 5 }
        ]);

        const topStudents = topStudentsAgg.map(s => ({
            name: s.name || "Noma'lum",
            class: s.className || "N/A",
            days: s.days,
            attendance: parseFloat(((s.days / dayOfMonth) * 100).toFixed(1))
        }));

        // Grade Analytics
        const gradeAgg = await Grade.aggregate([
            { $match: { date: { $gte: startOfMonthStr, $lte: endOfMonthStr } } },
            {
                $group: {
                    _id: null,
                    avgSchoolGrade: { $avg: "$value" },
                    totalGrades: { $sum: 1 }
                }
            }
        ]);

        const avgSchoolGrade = gradeAgg.length > 0 ? gradeAgg[0].avgSchoolGrade : 0;

        const subjectPerformance = await Grade.aggregate([
            { $match: { date: { $gte: startOfMonthStr, $lte: endOfMonthStr } } },
            {
                $group: {
                    _id: "$subject",
                    avg: { $avg: "$value" }
                }
            },
            { $sort: { avg: -1 } },
            { $project: { subject: "$_id", avg: { $round: ["$avg", 1] }, _id: 0 } }
        ]);

        const responseData = {
            success: true,
            stats: {
                avgAttendance: parseFloat(avgAttendance.toFixed(1)),
                bestClass: formattedClassPerf.length > 0 ? formattedClassPerf[0].class : 'N/A',
                bestClassRate: formattedClassPerf.length > 0 ? formattedClassPerf[0].attendance : 0,
                totalStudents: totalStudents || 0,
                latePercentage: presentToday > 0 ? parseFloat(((lateToday / presentToday) * 100).toFixed(1)) : 0,
                avgSchoolGrade: parseFloat(avgSchoolGrade.toFixed(1)),
                bestSubject: subjectPerformance.length > 0 ? subjectPerformance[0].subject : 'N/A'
            },
            charts: {
                monthlyTrend,
                attendanceDistribution,
                weeklyTrendData,
                classPerformance: formattedClassPerf,
                subjectPerformance,
                classGradeRanking: [] // Still simplified for now to avoid logic complexity
            },
            topStudents,
            topGradeStudents: await Grade.aggregate([
                { $match: { date: { $gte: startOfMonthStr, $lte: endOfMonthStr } } },
                {
                    $group: {
                        _id: "$studentId",
                        avgGrade: { $avg: "$value" },
                        totalGrades: { $sum: 1 }
                    }
                },
                { $sort: { avgGrade: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: "students",
                        localField: "_id",
                        foreignField: "_id",
                        as: "studentInfo"
                    }
                },
                { $unwind: "$studentInfo" },
                {
                    $project: {
                        name: "$studentInfo.name",
                        className: "$studentInfo.className",
                        avgGrade: { $round: ["$avgGrade", 1] },
                        totalGrades: 1,
                        _id: 0
                    }
                }
            ])
        };

        // Update cache
        statsCache = {
            data: responseData,
            lastUpdated: now.getTime()
        };

        res.json(responseData);

    } catch (error) {
        console.error('❌ REPORTS API CRASH:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const saveExcelReport = (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'File missing' });
        res.json({ success: true, message: 'Saved', filename: req.file.filename });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
