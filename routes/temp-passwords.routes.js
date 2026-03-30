import express from "express";
import Class from "../models/Class.js";

const router = express.Router();

const generateRandomPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

router.get("/generate-passwords", async (req, res) => {
  try {
    const classes = await Class.find({});

    let resultText = "--- SINF PAROLLARI RO'YXATI ---\n\n";

    for (const cls of classes) {
      const baseUsername = cls.name.replace(/\s+/g, "").toLowerCase();
      let parentUsername = cls.parentUsername || baseUsername;
      const newPassword = generateRandomPassword();

      cls.parentUsername = parentUsername;
      cls.parentPassword = newPassword;
      cls.hasParentLogin = true;

      await cls.save();

      resultText += `Sinf: ${cls.name}\n`;
      resultText += `Login: ${parentUsername}\n`;
      resultText += `Parol: ${newPassword}\n`;
      resultText += "---------------------------\n";
    }

    resultText +=
      "\nBarcha sinflar uchun tasodifiy parollar muvaffaqiyatli saqlandi!";

    // Return as plain text for easy copying
    res.setHeader("Content-Type", "text/plain");
    res.send(resultText);
  } catch (error) {
    console.error("Error generating passwords:", error);
    res.status(500).send("Xatolik yuz berdi: " + error.message);
  }
});

export default router;
