import Class from "../models/Class.js";
import Student from "../models/Student.js";
import Grade from "../models/Grade.js";
import { generateToken } from "../middleware/auth.js";

/**
 * Parent Login
 */
export const parentLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Username va password talab qilinadi" });
    }

    // Find class with matching parent credentials
    const cls = await Class.findOne({
      parentUsername: username,
      status: "active",
    });

    if (!cls) {
      return res
        .status(401)
        .json({ success: false, error: "Username yoki password noto'g'ri" });
    }

    // Check password (plain text for simplicity as requested/implied, or use bcrypt if you want)
    // Given existing code uses bcrypt for User, but Class model doesn't have it yet.
    // I'll use simple string comparison for now, or suggest bcrypt in implementation plan.
    if (cls.parentPassword !== password) {
      return res
        .status(401)
        .json({ success: false, error: "Username yoki password noto'g'ri" });
    }

    // Generate token with role 'parent' and id as classId
    const token = generateToken(cls._id, cls.parentUsername, "parent");

    res.json({
      success: true,
      message: "Muvaffaqiyatli kirildi",
      token,
      class: {
        id: cls._id,
        name: cls.name,
        grade: cls.grade,
        section: cls.section,
      },
    });
  } catch (error) {
    console.error("❌ PARENT LOGIN ERROR:", error);
    res.status(500).json({ success: false, error: "Server xatosi" });
  }
};

/**
 * Publicly fetch all active classes with student count
 * This stays public because it's the class selection screen
 */
export const getPublicClasses = async (req, res) => {
  try {
    const classes = await Class.find({ status: "active" }).sort({
      grade: 1,
      section: 1,
    });

    // Enrich with actual student count
    const enriched = await Promise.all(
      classes.map(async (cls) => {
        const count = await Student.countDocuments({
          className: cls.name,
          status: "active",
        });
        return {
          _id: cls._id,
          name: cls.name,
          grade: cls.grade,
          section: cls.section,
          studentCount: count,
          // Only provide hints, not credentials
          hasParentLogin: !!cls.parentUsername,
        };
      }),
    );

    res.json({ success: true, classes: enriched });
  } catch (error) {
    console.error("❌ PUBLIC CLASSES ERROR:", error);
    res.status(500).json({ success: false, error: "Failed to fetch classes" });
  }
};

/**
 * Fetch grades for a specific class (Secured)
 */
export const getPublicGrades = async (req, res) => {
  try {
    // req.user is populated by authenticateToken
    // For 'parent' role, req.user.id is the classId
    // We must ensure they are requesting the class they are logged into
    const { className, date } = req.query;

    if (!className || !date) {
      return res
        .status(400)
        .json({ success: false, error: "className and date are required" });
    }

    // Validation: Parent can only see THEIR class
    if (req.user.role === "parent") {
      const cls = await Class.findById(req.user.id);
      if (!cls || cls.name !== className) {
        return res.status(403).json({
          success: false,
          error: "Sizda bu sinf ma'lumotlarini ko'rish uchun ruxsat yo'q",
        });
      }
    }

    // 1. Fetch students in the class
    const students = await Student.find({ className })
      .select("name className")
      .sort({ name: 1 });

    if (students.length === 0) {
      return res.json({
        success: true,
        report: [],
        totalStudents: 0,
        totalGrades: 0,
      });
    }

    const studentIds = students.map((s) => s._id);

    // 2. Fetch grades for these students on the given date
    const grades = await Grade.find({
      studentId: { $in: studentIds },
      date: date,
    }).populate("teacherId", "username");

    // 3. Map grades to students
    const report = students.map((student) => {
      const studentGrades = grades.filter((g) => {
        const gStudentId = (g.studentId?._id || g.studentId)?.toString();
        return gStudentId === student._id.toString();
      });
      return {
        studentName: student.name,
        grades: studentGrades.map((g) => ({
          subject: g.subject,
          value: g.value,
          status: g.status,
          comment: g.comment,
          period: g.period,
          teacher: g.subject,
        })),
      };
    });

    res.json({
      success: true,
      report,
      totalStudents: students.length,
      totalGrades: grades.length,
    });
  } catch (error) {
    console.error("❌ PARENT GRADES ERROR:", error);
    res.status(500).json({ success: false, error: "Failed to fetch grades" });
  }
};

/**
 * Fetch ALL grades for a specific class (Secured)
 */
export const getPublicAllGrades = async (req, res) => {
  try {
    const { className } = req.query;

    if (!className) {
      return res
        .status(400)
        .json({ success: false, error: "className is required" });
    }

    // Validation: Parent can only see THEIR class
    if (req.user.role === "parent") {
      const cls = await Class.findById(req.user.id);
      if (!cls || cls.name !== className) {
        return res.status(403).json({
          success: false,
          error: "Sizda bu sinf ma'lumotlarini ko'rish uchun ruxsat yo'q",
        });
      }
    }

    const students = await Student.find({ className })
      .select("name className")
      .sort({ name: 1 });

    if (students.length === 0) {
      return res.json({ success: true, students: [], grades: [] });
    }

    const studentIds = students.map((s) => s._id);

    const grades = await Grade.find({ studentId: { $in: studentIds } }).sort({
      date: -1,
      subject: 1,
    });

    res.json({ success: true, students, grades });
  } catch (error) {
    console.error("❌ PARENT ALL GRADES ERROR:", error);
    res.status(500).json({ success: false, error: "Failed to fetch grades" });
  }
};
