import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import Student from "./models/Student.js";
import Class from "./models/Class.js";

dotenv.config();

const debugSpecialClass = async () => {
    try {
        await connectDB();

        // Exact string from the screenshot/user report
        const className = "1-tibbiyot guruhi";

        const classDoc = await Class.findOne({ name: className });
        console.log(`Class "${className}":`);
        console.log(` - ID: ${classDoc?._id}`);
        console.log(` - Stored studentCount: ${classDoc?.studentCount}`);

        // Check exact match
        const exactCount = await Student.countDocuments({ className: className });
        console.log(` - Students with exact className match: ${exactCount}`);

        // Check case insensitive match
        const regexCount = await Student.countDocuments({ className: { $regex: new RegExp(`^${className}$`, "i") } });
        console.log(` - Students with case-insensitive match: ${regexCount}`);

        // Check for trimmed match
        const trimmedCount = await Student.countDocuments({ className: className.trim() });
        console.log(` - Students with trimmed match: ${trimmedCount}`);

        // List a few students to see what their className actually is
        const students = await Student.find({ className: { $regex: /1-tibbiyot/i } }).limit(3);
        console.log("Sample students found:");
        students.forEach(s => console.log(` - Name: ${s.name}, className: "${s.className}"`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugSpecialClass();
