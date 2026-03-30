import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority";

async function fix() {
  await mongoose.connect(MONGODB_URI);
  const result = await mongoose.connection.db
    .collection("users")
    .findOneAndUpdate(
      { username: "teacher" },
      { $set: { fullName: "O'qituvchi" } },
      { returnDocument: "after" },
    );
  const updated = result?.fullName || result?.value?.fullName || result;
  console.log("Updated:", JSON.stringify(updated));
  await mongoose.disconnect();
}

fix().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
