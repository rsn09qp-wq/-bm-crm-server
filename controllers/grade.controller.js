import Grade from '../models/Grade.js';
import Student from '../models/Student.js';

const SCORE_MAP = { green: 5, yellow: 4, red: 2 };

export const saveGrade = async (req, res) => {
    try {
        const { studentId, subject, value, status, comment, date } = req.body;
        const teacherId = req.user.id;

        if (!studentId || !subject || !status || !date) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const grade = new Grade({
            studentId,
            teacherId,
            subject,
            value,
            status,
            comment,
            date,
            period: req.body.period
        });

        await grade.save();

        res.status(201).json({ success: true, grade });
    } catch (error) {
        console.error('❌ SAVE GRADE ERROR:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const getStudentGrades = async (req, res) => {
    try {
        const { studentId } = req.params;
        const grades = await Grade.find({ studentId }).sort({ date: -1 });
        res.json({ success: true, grades });
    } catch (error) {
        console.error('❌ GET GRADES ERROR:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const getTeacherGrades = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Admin sees all grades; teacher sees only their own
        let query = { teacherId: userId };
        if (userRole === 'admin') {
            query = {};
        }

        const grades = await Grade.find(query)
            .populate('studentId', 'name className')
            .populate('teacherId', 'username fullName')
            .sort({ date: -1 });

        res.json({ success: true, grades });
    } catch (error) {
        console.error('❌ GET TEACHER GRADES ERROR:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const updateGrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, value, status, comment, date } = req.body;
        const teacherId = req.user.id;

        // Find the grade and verify ownership (unless admin)
        const grade = await Grade.findById(id);
        if (!grade) {
            return res.status(404).json({ success: false, error: 'Baho topilmadi' });
        }

        if (grade.teacherId.toString() !== teacherId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Sizda bu bahoni o\'zgartirish huquqi yo\'q' });
        }

        // Update fields
        if (subject) grade.subject = subject;
        if (value !== undefined) grade.value = value;
        if (status) grade.status = status;
        if (comment !== undefined) grade.comment = comment;
        if (date) grade.date = date;

        await grade.save();

        res.json({ success: true, grade });
    } catch (error) {
        console.error('❌ UPDATE GRADE ERROR:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const deleteGrade = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;

        const grade = await Grade.findById(id);
        if (!grade) {
            return res.status(404).json({ success: false, error: 'Baho topilmadi' });
        }

        if (grade.teacherId.toString() !== teacherId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Sizda bu bahoni o\'chirish huquqi yo\'q' });
        }

        await Grade.findByIdAndDelete(id);

        res.json({ success: true, message: 'Baho o\'chirildi' });
    } catch (error) {
        console.error('❌ DELETE GRADE ERROR:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const getGradesByClass = async (req, res) => {
    try {
        const { className } = req.query;

        if (!className) {
            return res.status(400).json({ success: false, error: 'className is required' });
        }

        // 1. Fetch all students in this class
        const students = await Student.find({ className }).select('name className').sort({ name: 1 });

        if (students.length === 0) {
            return res.json({ success: true, students: [], grades: [] });
        }

        const studentIds = students.map(s => s._id);

        // 2. Fetch all grades for these students
        const grades = await Grade.find({ studentId: { $in: studentIds } })
            .populate('teacherId', 'username fullName')
            .sort({ date: 1, subject: 1 });

        res.json({ success: true, students, grades });
    } catch (error) {
        console.error('❌ GET GRADES BY CLASS ERROR:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const saveBulkGrades = async (req, res) => {
    try {
        const { grades } = req.body;
        const teacherId = req.user.id;

        if (!grades || !Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({ success: false, error: 'Baho ma\'lumotlari (massiv shaklida) talab qilinadi' });
        }

        const gradeDocs = grades.map(g => ({
            studentId: g.studentId,
            teacherId,
            subject: g.subject,
            value: g.value,
            status: g.status,
            comment: g.comment || '',
            date: g.date,
            period: g.period
        }));

        // Use insertMany for efficient bulk saving
        const savedGrades = await Grade.insertMany(gradeDocs);

        res.status(201).json({
            success: true,
            message: `${savedGrades.length} ta baho muvaffaqiyatli saqlandi`,
            count: savedGrades.length
        });
    } catch (error) {
        console.error('❌ SAVE BULK GRADES ERROR:', error);
        res.status(500).json({ success: false, error: 'Server xatosi', message: error.message });
    }
};

// ── Gamification: Rankings & Badges ──

// ── Streaks ──
const detectStreak = (grades) => {
    let streak = 0;
    const sorted = [...grades].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort descending by date
    for (const g of sorted) {
        if (g.status === 'green') streak++;
        else break; // Streak broken
    }
    return streak >= 3 ? streak : 0; // Only count streaks of 3 or more
};

// ── Badges Logic ──
const detectBadges = (grades) => {
    const badges = [];
    // Bilimdon: 5 consecutive "green" grades
    let streak = 0;
    const sorted = [...grades].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const g of sorted) {
        streak = g.status === 'green' ? streak + 1 : 0;
        if (streak >= 5) { badges.push({ id: 'bilimdon', label: 'Bilimdon', icon: '🏆', desc: "Ketma-ket 5 ta a'lo baho" }); break; }
    }
    // Tirishqoq: 10+ grades in one week
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const weekGrades = grades.filter(g => new Date(g.date) >= weekAgo);
    if (weekGrades.length >= 10) badges.push({ id: 'tirishqoq', label: 'Tirishqoq', icon: '⚡', desc: 'Haftada 10+ baho' });
    // Faol: Grades in 3+ different subjects this week
    const weekSubjects = new Set(weekGrades.map(g => g.subject));
    if (weekSubjects.size >= 3) badges.push({ id: 'faol', label: 'Faol', icon: '🌟', desc: '3+ fandan baho' });
    return badges;
};

export const getRankings = async (req, res) => {
    try {
        const { period = '7', subject } = req.query; // Add subject to query params
        const days = parseInt(period) || 7;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split('T')[0];

        const query = { date: { $gte: sinceStr } };
        if (subject && subject !== 'all') { // Filter by subject if provided
            query.subject = subject;
        }

        const grades = await Grade.find(query)
            .populate('studentId', 'name className')
            .lean();

        const availableSubjects = [...new Set(grades.map(g => g.subject))].filter(Boolean).sort();

        // ── Student Rankings ──
        const studentMap = {};
        grades.forEach(g => {
            const sid = g.studentId?._id?.toString();
            if (!sid) return;
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    id: sid,
                    name: g.studentId.name,
                    className: g.studentId.className,
                    totalScore: 0,
                    count: 0,
                    grades: []
                };
            }
            studentMap[sid].totalScore += SCORE_MAP[g.status] || 0;
            studentMap[sid].count += 1;
            studentMap[sid].grades.push(g);
        });

        const studentRankings = Object.values(studentMap)
            .map(s => ({
                ...s,
                avg: s.count > 0 ? +(s.totalScore / s.count).toFixed(2) : 0,
                badges: detectBadges(s.grades),
                streak: detectStreak(s.grades), // Add streak to student rankings
                grades: undefined // don't send raw grades to client
            }))
            .sort((a, b) => (b.avg - a.avg) || (b.totalScore - a.totalScore))
            .map((s, idx) => ({ ...s, rank: idx + 1 })); // Use idx for rank

        // ── Class Rankings ──
        const classMap = {};
        grades.forEach(g => {
            const cls = g.studentId?.className;
            if (!cls) return;
            if (!classMap[cls]) classMap[cls] = { name: cls, totalScore: 0, count: 0, students: new Set() };
            classMap[cls].totalScore += SCORE_MAP[g.status] || 0;
            classMap[cls].count += 1;
            classMap[cls].students.add(g.studentId?._id?.toString());
        });

        const classRankings = Object.values(classMap)
            .map(c => ({
                name: c.name,
                totalScore: c.totalScore,
                count: c.count,
                studentCount: c.students.size,
                avg: c.count > 0 ? +(c.totalScore / c.count).toFixed(2) : 0
            }))
            .sort((a, b) => b.avg - a.avg)
            .map((c, index) => ({ ...c, rank: index + 1 }));

        // ── Student of the Week ──
        const studentOfWeek = studentRankings.length > 0 ? studentRankings[0] : null;

        res.json({
            success: true,
            period: days,
            studentRankings,
            classRankings,
            studentOfWeek,
            totalGrades: grades.length
        });
    } catch (error) {
        console.error('❌ GET RANKINGS ERROR:', error);
        res.status(500).json({ success: false, error: 'Server xatosi', message: error.message });
    }
};

// ── AI Integration: Trend Analysis & Auto Reports ──

const predictTrend = (grades) => {
    const vals = grades.map(g => SCORE_MAP[g.status] || 3);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const average = +avg.toFixed(2);
    if (grades.length < 3) return { trend: 'neutral', predicted: null, direction: '→', average };
    const sorted = [...grades].sort((a, b) => new Date(a.date) - new Date(b.date));
    const values = sorted.map(g => SCORE_MAP[g.status] || 3);
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    values.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
    const slope = den !== 0 ? num / den : 0;
    const predicted = Math.min(5, Math.max(2, +(yMean + slope * 3).toFixed(1)));
    const trend = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'neutral';
    const direction = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    return { trend, predicted, direction, slope: +slope.toFixed(3), average };
};

export const getAIInsights = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const sinceStr = thirtyDaysAgo.toISOString().split('T')[0];

        const grades = await Grade.find({ date: { $gte: sinceStr } })
            .populate('studentId', 'name className')
            .lean();

        // ── Per-Student Predictions ──
        const studentMap = {};
        grades.forEach(g => {
            const sid = g.studentId?._id?.toString();
            if (!sid) return;
            if (!studentMap[sid]) {
                studentMap[sid] = { id: sid, name: g.studentId.name, className: g.studentId.className, grades: [], subjects: {} };
            }
            studentMap[sid].grades.push(g);
            const sub = g.subject;
            if (!studentMap[sid].subjects[sub]) studentMap[sid].subjects[sub] = [];
            studentMap[sid].subjects[sub].push(g);
        });

        const studentInsights = Object.values(studentMap).map(s => {
            const overall = predictTrend(s.grades);
            const subjectTrends = Object.entries(s.subjects).map(([subject, subGrades]) => {
                const t = predictTrend(subGrades);
                return { subject, ...t, count: subGrades.length };
            });
            const declining = subjectTrends.filter(t => t.trend === 'down');
            const improving = subjectTrends.filter(t => t.trend === 'up');
            return {
                id: s.id, name: s.name, className: s.className,
                overall, subjectTrends, declining, improving,
                totalGrades: s.grades.length
            };
        }).sort((a, b) => (a.overall.slope || 0) - (b.overall.slope || 0));

        // ── Auto Report (Uzbek) ──
        const classMap = {};
        grades.forEach(g => {
            const cls = g.studentId?.className;
            if (!cls) return;
            if (!classMap[cls]) classMap[cls] = { total: 0, green: 0, yellow: 0, red: 0 };
            classMap[cls].total++;
            if (g.status === 'green') classMap[cls].green++;
            else if (g.status === 'yellow') classMap[cls].yellow++;
            else classMap[cls].red++;
        });

        const reportLines = [];
        reportLines.push(`📊 **Haftalik tahlil** (${sinceStr} — ${now.toISOString().split('T')[0]})`);
        reportLines.push('');
        reportLines.push(`📋 Jami **${grades.length}** ta baho qayd etildi.`);
        reportLines.push('');

        Object.entries(classMap)
            .sort(([, a], [, b]) => (b.green / b.total) - (a.green / a.total))
            .forEach(([cls, data]) => {
                const pct = ((data.green / data.total) * 100).toFixed(0);
                const emoji = pct >= 70 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
                reportLines.push(`${emoji} **${cls}**: ${pct}% a'lo (${data.green}/${data.total})`);
            });

        reportLines.push('');
        const atRisk = studentInsights.filter(s => s.overall.trend === 'down').slice(0, 5);
        if (atRisk.length > 0) {
            reportLines.push("⚠️ **Diqqat talab qiluvchi o'quvchilar:**");
            atRisk.forEach(s => {
                const subjects = s.declining.map(d => d.subject).join(', ');
                reportLines.push(`  • ${s.name} (${s.className}) — ${subjects} fanlarida pasayish`);
            });
        }
        const stars = studentInsights.filter(s => s.overall.trend === 'up').slice(0, 3);
        if (stars.length > 0) {
            reportLines.push('');
            reportLines.push("⭐ **O'sish ko'rsatayotgan o'quvchilar:**");
            stars.forEach(s => {
                const subjects = s.improving.map(d => d.subject).join(', ');
                reportLines.push(`  • ${s.name} (${s.className}) — ${subjects}`);
            });
        }

        res.json({
            success: true,
            studentInsights: studentInsights,
            report: reportLines.join('\n'),
            stats: {
                totalGrades: grades.length,
                totalStudents: Object.keys(studentMap).length,
                totalClasses: Object.keys(classMap).length,
                atRiskCount: atRisk.length,
                improvingCount: stars.length
            }
        });
    } catch (error) {
        console.error('❌ AI INSIGHTS ERROR:', error);
        res.status(500).json({ success: false, error: 'Server xatosi', message: error.message });
    }
};
