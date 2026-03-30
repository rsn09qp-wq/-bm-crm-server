import mongoose from "mongoose";
import dotenv from "dotenv";
import Class from "./models/Class.js";
import connectDB from "./db/connection.js";

dotenv.config();

const checkClasses = async () => {
  try {
    await connectDB();
    const classes = await Class.find({}, "name parentUsername parentPassword");
    console.log("📊 Mevjud sinflar va ularning parollari:");
    classes.forEach((c) => {
      console.log(
        `- Sinf: ${c.name} | Login: ${c.parentUsername || "Yo'q"} | Parol: ${c.parentPassword || "Yo'q"}`,
      );
    });
    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error);
    process.exit(1);
  }
};

checkClasses();
