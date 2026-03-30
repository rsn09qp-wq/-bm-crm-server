import mongoose from "mongoose";
import dotenv from "dotenv";
import Class from "./models/Class.js";
import connectDB from "./db/connection.js";

dotenv.config();

const fixAllCredentials = async () => {
  try {
    await connectDB();
    const classes = await Class.find({ status: "active" });

    console.log(
      `📊 ${classes.length} ta aktiv sinf topildi. Tekshirilmoqda...`,
    );

    for (const cls of classes) {
      // Username yaratish: bo'sh joysiz, kichik harf
      const generatedUsername = cls.name.toLowerCase().replace(/\s+/g, "");
      const generatedPassword = "password123";

      // Agar hali yo'q bo'lsa yoki o'zgartirish kerak bo'lsa
      const update = {
        parentUsername: generatedUsername,
        parentPassword: generatedPassword,
      };

      await Class.findByIdAndUpdate(cls._id, update);
      console.log(
        `✅ Sinf: ${cls.name} -> Login: ${generatedUsername} | Parol: ${generatedPassword}`,
      );
    }

    console.log("\n🚀 Barcha sinflar uchun loginlar o'rnatildi!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Xatolik:", error);
    process.exit(1);
  }
};

fixAllCredentials();
