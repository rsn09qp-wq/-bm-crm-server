import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";

dotenv.config();

const fixTeacherDepartments = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        const teachers = await Employee.find({ role: "teacher" });
        console.log(`📊 Found ${teachers.length} teachers to check`);

        let count = 0;
        for (const teacher of teachers) {
            if (teacher.department !== "O'qituvchi") {
                console.log(`🔧 Fixing ${teacher.name}: "${teacher.department}" -> "O'qituvchi"`);
                teacher.department = "O'qituvchi";
                await teacher.save();
                count++;
            }
        }

        console.log(`✅ Finished! Updated ${count} teachers.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

fixTeacherDepartments();
