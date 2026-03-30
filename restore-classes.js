import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import Class from "./models/Class.js";
import Student from "./models/Student.js";

dotenv.config();

// Helper function to create class if not exists
const ensureClassExists = async (className) => {
    if (!className || className === "Sinf ko'rsatilmagan") return null;

    let classDoc = await Class.findOne({ name: className });
    if (!classDoc) {
        let grade = 1;
        let section = className;

        const cleanClassName = className.trim();

        // Pattern: "9 blue", "9-blue", "9blue"
        if (/^\d+[-\s]*[a-zA-Z]+$/i.test(cleanClassName)) {
            const matches = cleanClassName.match(/^(\d+)[-\s]*([a-zA-Z]+)$/i);
            if (matches) {
                grade = parseInt(matches[1]);
                section = matches[2];
            }
        }
        // Pattern: faqat raqam "9"
        else if (/^\d+$/i.test(cleanClassName)) {
            grade = parseInt(cleanClassName);
            section = "A";
        }
        // Pattern: "1-tibbiyot guruhi"
        else if (cleanClassName.toLowerCase().includes("guruhi") || cleanClassName.toLowerCase().includes("guruh")) {
            const numberMatch = cleanClassName.match(/\d+/);
            grade = numberMatch ? parseInt(numberMatch[0]) : 1;
            section = cleanClassName;
        }
        // Boshqa formatlar
        else {
            const numberMatch = cleanClassName.match(/\d+/);
            grade = numberMatch ? parseInt(numberMatch[0]) : 1;
            section = cleanClassName;
        }

        if (grade < 1) grade = 1;
        if (grade > 12) grade = 12;

        classDoc = new Class({
            name: className,
            grade: grade,
            section: typeof section === 'string' ? section.charAt(0).toUpperCase() + section.slice(1).toLowerCase() : section,
        });
        await classDoc.save();
        console.log(`📚 [RESTORE] Created class: ${className} (grade: ${grade}, section: ${section})`);
    } else {
        // console.log(`Class already exists: ${className}`);
    }
    return classDoc;
};

const restoreClasses = async () => {
    try {
        await connectDB();
        console.log("Starting class restoration...");

        // Get all students to check connection
        const count = await Student.countDocuments();
        console.log(`Total students in DB: ${count}`);

        const students = await Student.find({}, 'className');
        const uniqueClassNames = [...new Set(students.map(s => s.className))];

        console.log(`Found ${uniqueClassNames.length} unique class names.`);

        for (const className of uniqueClassNames) {
            if (className) {
                await ensureClassExists(className);
            }
        }

        console.log("Restoration complete.");
        process.exit(0);
    } catch (error) {
        console.error("Restoration failed:", error);
        process.exit(1);
    }
};

restoreClasses();
