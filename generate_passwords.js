require("dotenv").config();
const mongoose = require("mongoose");

// Define Class schema locally to avoid import issues
const classSchema = new mongoose.Schema(
  {
    name: String,
    parentUsername: String,
    parentPassword: String,
    hasParentLogin: { type: Boolean, default: false },
  },
  { strict: false },
);

const Class = mongoose.model("Class", classSchema);

// Function to generate a random 6-character alphanumeric password
const generateRandomPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // Removed similar looking characters like i, l, 1, o, 0
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const updatePasswords = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGODB_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const classes = await Class.find({});
    console.log(`Found ${classes.length} classes.`);

    console.log("\n--- SINF PAROLLARI RO'YXATI ---\n");

    for (const cls of classes) {
      // Create a username based on class name stripped of spaces, lowercase
      const baseUsername = cls.name.replace(/\s+/g, "").toLowerCase();
      let parentUsername = cls.parentUsername || baseUsername;

      // Keep existing username if it exists, otherwise use the generated one

      const newPassword = generateRandomPassword();

      cls.parentUsername = parentUsername;
      cls.parentPassword = newPassword;
      cls.hasParentLogin = true;

      await cls.save();

      console.log(`Sinf: ${cls.name}`);
      console.log(`Login: ${parentUsername}`);
      console.log(`Parol: ${newPassword}`);
      console.log("---------------------------");
    }

    console.log(
      "\n✅ Barcha sinflar uchun tasodifiy parollar muvaffaqiyatli saqlandi!",
    );
    process.exit(0);
  } catch (error) {
    console.error("Error updating passwords:", error);
    process.exit(1);
  }
};

updatePasswords();
