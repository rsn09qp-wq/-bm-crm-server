import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/Student.js";
import Employee from "./models/Employee.js";
import Attendance from "./models/Attendance.js";

dotenv.config();

const MAPPINGS = {
  AbdullayevaIrodaxon: "Abdullayeva Irodaxon",
  AbdullayevaFarangiz: "Abdullayeva Farangiz",
  AbdullayevaSamira: "Abdullayeva Samira",
  AbdullayevaMominaxon: "Abdullayeva Mominaxon",
};

async function restoreNames() {
  try {
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    for (const [hikId, realName] of Object.entries(MAPPINGS)) {
      console.log(`\n🔄 Restoring: ${realName} (ID: ${hikId})`);

      // 1. Update Students
      const studentResult = await Student.updateMany(
        { hikvisionEmployeeId: hikId, name: "O'qituvchi" },
        { $set: { name: realName } },
      );
      console.log(`   - Students updated: ${studentResult.modifiedCount}`);

      // 2. Update Employees
      const employeeResult = await Employee.updateMany(
        { hikvisionEmployeeId: hikId, name: "O'qituvchi" },
        { $set: { name: realName } },
      );
      console.log(`   - Employees updated: ${employeeResult.modifiedCount}`);

      // 3. Update Attendance
      const attendanceResult = await Attendance.updateMany(
        { hikvisionEmployeeId: hikId, name: "O'qituvchi" },
        { $set: { name: realName } },
      );
      console.log(`   - Attendance updated: ${attendanceResult.modifiedCount}`);
    }

    console.log("\n✅ Restoration complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during restoration:", error);
    process.exit(1);
  }
}

restoreNames();
