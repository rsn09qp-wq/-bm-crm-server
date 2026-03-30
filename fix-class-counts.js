import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import Class from "./models/Class.js";
import Student from "./models/Student.js";

dotenv.config();

const syncClassCounts = async () => {
    try {
        await connectDB();
        console.log("🔄 [SYNC] Synchronizing class counts...");

        const allClasses = await Class.find({});
        console.log(`Found ${allClasses.length} classes.`);

        for (const classDoc of allClasses) {
            const studentCount = await Student.countDocuments({
                className: { $regex: new RegExp(`^${classDoc.name}$`, "i") },
                status: "active"
            });

            if (classDoc.studentCount !== studentCount) {
                console.log(`Updating ${classDoc.name}: ${classDoc.studentCount} -> ${studentCount}`);
                classDoc.studentCount = studentCount;
                await classDoc.save();
            } else {
                console.log(`Class ${classDoc.name} is up to date (${studentCount})`);
            }
        }
        console.log("✅ [SYNC] Class counts synchronized successfully");
        process.exit(0);
    } catch (error) {
        console.error("❌ [SYNC] Error syncing class counts:", error);
        process.exit(1);
    }
};

syncClassCounts();
