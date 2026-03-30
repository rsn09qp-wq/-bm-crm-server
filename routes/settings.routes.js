import express from "express";
import Settings from "../models/Settings.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Get settings (public or protected based on requirement, usually protected but accessible to all staff)
router.get("/", async (req, res) => {
    try {
        const settings = await Settings.getInstance();
        res.json(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ error: "Sozlamalarni yuklashda xato" });
    }
});

// Update settings (Admin only)
router.put("/", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            // Prevent updating internal fields like _id or timestamps manually if passed
            if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
                settings[key] = req.body[key];
            }
        });

        await settings.save();

        // Broadcast update via socket if needed
        if (global.io) {
            global.io.emit("settings:updated", settings);
        }

        res.json({ message: "Sozlamalar saqlandi", settings });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ error: "Sozlamalarni saqlashda xato" });
    }
});

export default router;
