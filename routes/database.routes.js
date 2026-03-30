import express from "express";
import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// Get Cloudinary usage statistics
router.get("/cloudinary", async (req, res) => {
    try {
        const usage = await cloudinary.api.usage();
        // console.log("☁️ Cloudinary Usage Data:", usage); // For debugging

        // Ensure we have numbers and fallbacks
        const storageUsage = (usage.storage && typeof usage.storage.usage === 'number') ? usage.storage.usage : 0;
        const storageLimit = (usage.storage && typeof usage.storage.limit === 'number') ? usage.storage.limit : 25 * 1024 * 1024 * 1024; // 25GB Default

        const creditsUsage = (usage.credits && typeof usage.credits.usage === 'number') ? usage.credits.usage : 0;
        const creditsLimit = (usage.credits && typeof usage.credits.limit === 'number') ? usage.credits.limit : 25;

        res.json({
            success: true,
            stats: {
                used: storageUsage,
                limit: storageLimit,
                usedPercentage: storageLimit > 0 ? (storageUsage / storageLimit) * 100 : 0,
                creditsUsed: creditsUsage,
                creditsLimit: creditsLimit,
                creditsPercentage: creditsLimit > 0 ? (creditsUsage / creditsLimit) * 100 : 0
            }
        });
    } catch (error) {
        console.error("Cloudinary usage error:", error);
        res.status(500).json({
            success: false,
            error: "Cloudinary statistikasini olishda xato",
            message: error.message
        });
    }
});

// Clean Cloudinary homework images folder
router.post("/cloudinary/clean", async (req, res) => {
    try {
        // Delete all resources in the 'homework_images' folder
        const result = await cloudinary.api.delete_resources_by_prefix('homework_images/');

        console.log("🧹 Cloudinary folder 'homework_images' cleaned:", result);

        res.json({
            success: true,
            message: "Cloudinary 'homework_images' papkasi tozalandi",
            result
        });
    } catch (error) {
        console.error("Cloudinary clean error:", error);
        res.status(500).json({
            success: false,
            error: "Cloudinary'ni tozalashda xato",
            message: error.message
        });
    }
});

// Delete ALL Cloudinary resources
router.delete("/cloudinary", async (req, res) => {
    try {
        // This is a destructive action - delete all resources
        const result = await cloudinary.api.delete_all_resources();

        console.log("🗑️ ALL Cloudinary resources deleted:", result);

        res.json({
            success: true,
            message: "Cloudinary barcha ma'lumotlari o'chirildi",
            result
        });
    } catch (error) {
        console.error("Cloudinary delete all error:", error);
        res.status(500).json({
            success: false,
            error: "Cloudinary'ni butunlay o'chirishda xato",
            message: error.message
        });
    }
});

// Get database statistics
router.get("/stats", async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (!mongoose.connection.db) {
            return res.status(503).json({
                success: false,
                error: "Ma'lumotlar bazasiga ulanish yo'q",
                message: "Database not connected yet"
            });
        }

        const db = mongoose.connection.db;

        // Get database stats
        const dbStats = await db.stats();

        // Get collections info
        const collections = await db.listCollections().toArray();
        const collectionsStats = [];

        for (const collection of collections) {
            try {
                // Use db.command() with collStats instead of collection.stats()
                const collStats = await db.command({ collStats: collection.name });
                collectionsStats.push({
                    name: collection.name,
                    size: collStats.size || 0,
                    count: collStats.count || 0,
                    storageSize: collStats.storageSize || 0,
                    indexSize: collStats.totalIndexSize || 0,
                });
            } catch (error) {
                console.error(`Error getting stats for ${collection.name}:`, error.message);
                // Add collection with zero stats if error occurs
                collectionsStats.push({
                    name: collection.name,
                    size: 0,
                    count: 0,
                    storageSize: 0,
                    indexSize: 0,
                });
            }
        }

        // Sort collections by size (largest first)
        collectionsStats.sort((a, b) => b.size - a.size);

        // MongoDB Atlas free tier limit is 512 MB
        const FREE_TIER_LIMIT = 512 * 1024 * 1024; // 512 MB in bytes

        // Calculate stats
        const totalSize = dbStats.dataSize + dbStats.indexSize;
        const usedPercentage = ((totalSize / FREE_TIER_LIMIT) * 100).toFixed(2);
        const freeSpace = FREE_TIER_LIMIT - totalSize;

        res.json({
            success: true,
            stats: {
                // Total sizes
                totalSize: totalSize,
                dataSize: dbStats.dataSize,
                storageSize: dbStats.storageSize,
                indexSize: dbStats.indexSize,

                // Free tier info
                freeTierLimit: FREE_TIER_LIMIT,
                usedPercentage: parseFloat(usedPercentage),
                freeSpace: Math.max(freeSpace, 0),

                // Database info
                database: dbStats.db,
                collections: dbStats.collections,
                objects: dbStats.objects,

                // Collections details
                collectionsDetails: collectionsStats,
            }
        });
    } catch (error) {
        console.error("Database stats error:", error);
        res.status(500).json({
            success: false,
            error: "Ma'lumotlar bazasi statistikasini olishda xato",
            message: error.message
        });
    }
});

// Critical collections that cannot be dropped
const CRITICAL_COLLECTIONS = ['employees', 'attendances', 'classes', 'users', 'grades', 'schedules'];

// Clean all documents from a specific collection
router.post("/collections/:name/clean", async (req, res) => {
    try {
        const { name } = req.params;

        if (!mongoose.connection.db) {
            return res.status(503).json({
                success: false,
                error: "Ma'lumotlar bazasiga ulanish yo'q"
            });
        }

        const db = mongoose.connection.db;

        // Check if collection exists
        const collections = await db.listCollections({ name }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Collection '${name}' topilmadi`
            });
        }

        // Clean the collection
        const result = await db.collection(name).deleteMany({});

        console.log(`🧹 Cleaned collection '${name}': ${result.deletedCount} documents deleted`);

        res.json({
            success: true,
            message: `Collection '${name}' tozalandi`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Collection clean error:", error);
        res.status(500).json({
            success: false,
            error: "Collection'ni tozalashda xato",
            message: error.message
        });
    }
});

// Drop a specific collection
router.delete("/collections/:name", async (req, res) => {
    try {
        const { name } = req.params;

        // Protect critical collections
        if (CRITICAL_COLLECTIONS.includes(name)) {
            return res.status(403).json({
                success: false,
                error: `Collection '${name}' muhim collection, o'chirib bo'lmaydi`
            });
        }

        if (!mongoose.connection.db) {
            return res.status(503).json({
                success: false,
                error: "Ma'lumotlar bazasiga ulanish yo'q"
            });
        }

        const db = mongoose.connection.db;

        // Check if collection exists
        const collections = await db.listCollections({ name }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Collection '${name}' topilmadi`
            });
        }

        // Drop the collection
        await db.collection(name).drop();

        console.log(`🗑️ Dropped collection '${name}'`);

        res.json({
            success: true,
            message: `Collection '${name}' o'chirildi`
        });
    } catch (error) {
        console.error("Collection drop error:", error);
        res.status(500).json({
            success: false,
            error: "Collection'ni o'chirishda xato",
            message: error.message
        });
    }
});

// Optimize database (compact and rebuild indexes)
router.post("/optimize", async (req, res) => {
    try {
        if (!mongoose.connection.db) {
            return res.status(503).json({
                success: false,
                error: "Ma'lumotlar bazasiga ulanish yo'q"
            });
        }

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const report = [];

        for (const collection of collections) {
            try {
                // Rebuild indexes
                await db.collection(collection.name).reIndex();
                report.push({
                    collection: collection.name,
                    status: 'optimized'
                });
            } catch (error) {
                report.push({
                    collection: collection.name,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log(`⚡ Database optimized: ${report.length} collections processed`);

        res.json({
            success: true,
            message: "Database optimallashtirildi",
            report
        });
    } catch (error) {
        console.error("Database optimize error:", error);
        res.status(500).json({
            success: false,
            error: "Database'ni optimalashtirishda xato",
            message: error.message
        });
    }
});

export default router;
