import { Router } from "express";
import {
  getPublicClasses,
  getPublicGrades,
  getPublicAllGrades,
  parentLogin,
} from "../controllers/parent.controller.js";
import Homework from "../models/Homework.js";
import { authenticateToken } from "../middleware/auth.js";
import Class from "../models/Class.js";

const router = Router();

// GET /api/parent/classes - Fetch all active classes (public)
// This stays public so parents can select their class
router.get("/classes", getPublicClasses);

// POST /api/parent/login - Parent login
router.post("/login", parentLogin);

// SECURED ROUTES - All routes below require parent (or admin/teacher) token
router.use(authenticateToken);

// GET /api/parent/grades?className=X&date=Y - Fetch grades for a class on a date
router.get("/grades", getPublicGrades);

// GET /api/parent/all-grades?className=X - Fetch ALL grades for a class
router.get("/all-grades", getPublicAllGrades);

// GET /api/parent/homework?className=X - Fetch homework for a class
router.get("/homework", async (req, res) => {
  try {
    const { className } = req.query;
    if (!className)
      return res.status(400).json({ error: "className talab qilinadi" });

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

    const homework = await Homework.find({ className }).sort({ date: -1 });
    res.json({ success: true, homework });
  } catch (error) {
    console.error("Parent homework error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
