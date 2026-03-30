import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
    schoolName: { type: String, default: "Boborahim Mashrab xususiy maktabi" },
    address: { type: String, default: "Namangan viloyat, Chust tumani" },
    phone: { type: String, default: "+998 69 555 12 34" },
    email: { type: String, default: "info@boborahim-mashrab.uz" },
    website: { type: String, default: "www.boborahim-mashrab.uz" },
    startTime: { type: String, default: "08:00" },
    endTime: { type: String, default: "14:00" },
    lateThreshold: { type: String, default: "08:30" },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    weeklyReports: { type: Boolean, default: true },
    monthlyReports: { type: Boolean, default: true },
    theme: { type: String, default: "light" },
    language: { type: String, default: "uz" },
    dateFormat: { type: String, default: "dd/mm/yyyy" },
    timeFormat: { type: String, default: "24h" },
}, { timestamps: true });

// Ensure only one settings document exists
settingsSchema.statics.getInstance = async function () {
    const settings = await this.findOne();
    if (settings) return settings;
    return await this.create({});
};

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
