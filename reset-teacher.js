import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import connectDB from "./db/connection.js";
import Employee from "./models/Employee.js"; // In case it uses Employee model

dotenv.config();

const resetTeacherPassword = async () => {
  try {
    await connectDB();

    // Check User collection
    let user = await User.findOne({ username: "teacher" });
    if (user) {
      user.password = "teacher123"; // The pre-save hook will hash this
      await user.save();
      console.log(
        '✅ User "teacher" topildi. Parol "teacher123" ga o\'zgartirildi.',
      );
    } else {
      console.log(
        '❌ "teacher" username ga ega foydalanuvchi User kolleksiyasida topilmadi.',
      );

      // Let's create one if it doesn't exist, or just find any teacher
      const anyTeacher = await User.findOne({ role: "teacher" });
      if (anyTeacher) {
        console.log(
          `Boshqa o'qituvchi topildi: username="${anyTeacher.username}"`,
        );
        anyTeacher.password = "teacher123";
        await anyTeacher.save();
        console.log(`✅ Uning paroli ham "teacher123" ga o'zgartirildi.`);
      } else {
        console.log(
          "Hozircha bazada ro'yxatdan o'tgan o'qituvchi yo'q. Yangi 'teacher' profili yaratilmoqda...",
        );
        const newTeacher = new User({
          username: "teacher",
          password: "teacher123",
          email: "teacher@test.com",
          role: "teacher",
          fullName: "O'qituvchi Test",
          isActive: true,
        });
        await newTeacher.save();
        console.log(
          '✅ Yangi "teacher" profili yaratildi. Parol: "teacher123"',
        );
      }
    }

    // Also check Employee collection just in case
    let emp = await Employee.findOne({ phone: "+998901234567" }); // Or some criteria

    process.exit(0);
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
};

resetTeacherPassword();
