import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import Student from "./models/Student.js";
import Class from "./models/Class.js";

dotenv.config();

const debugStatuses = async () => {
    try {
        await connectDB();

        const className = "5 blue"; // One of the problematic classes
        const classDoc = await Class.findOne({ name: className });

        if (!classDoc) {
            console.log(`Class ${className} not found!`);
            return;
        }

        console.log(`Class ${className}: Stored studentCount = ${classDoc.studentCount}`);

        const allStudents = await Student.find({ className: className });
        console.log(`Total students in ${className} (Student collection): ${allStudents.length}`);

        const breakdown = {};
        allStudents.forEach(s => {
            const status = s.status || "UNDEFINED";
            breakdown[status] = (breakdown[status] || 0) + 1;
        });
        console.log("Status Breakdown for 5 blue:", breakdown);

        const activeCount = await Student.countDocuments({ className: className, status: "active" });
        console.log(`Active count matches? ${activeCount}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugStatuses();
