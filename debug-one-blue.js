import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import Student from "./models/Student.js";
import Class from "./models/Class.js";

dotenv.config();

const debugOneBlue = async () => {
    try {
        await connectDB();

        const className = "1 blue";
        const classDoc = await Class.findOne({ name: className });

        console.log(`Class ${className}: DB stored count = ${classDoc ? classDoc.studentCount : 'Not Found'}`);

        const students = await Student.find({ className: className });
        console.log(`Actual students in ${className}: ${students.length}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugOneBlue();
