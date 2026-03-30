import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import Class from "./models/Class.js";

dotenv.config();

const checkClasses = async () => {
    try {
        await connectDB();
        const classes = await Class.find({});
        console.log(`Total classes: ${classes.length}`);

        const statusCounts = {};
        const yearCounts = {};

        classes.forEach(c => {
            const s = c.status || 'UNDEFINED';
            const y = c.academicYear || 'UNDEFINED';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
            yearCounts[y] = (yearCounts[y] || 0) + 1;
        });

        console.log("Status distribution:", statusCounts);
        console.log("Year distribution:", yearCounts);

        console.log("--------------------------------");
        classes.forEach(c => {
            console.log(`"${c.name}" | Status: ${c.status} | Year: ${c.academicYear}`);
        });

        console.log("\n--- Student Data ---");
        const students = await Student.find({}, 'className name');
        console.log(`Total students: ${students.length}`);

        const uniqueClassNames = [...new Set(students.map(s => s.className))];
        console.log(`Unique class names in Students: ${uniqueClassNames.length}`);
        console.log("Classes found in students:", uniqueClassNames.sort());

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkClasses();
