import Homework from "../models/Homework.js";
import { cloudinary } from "../config/cloudinary.js";

// Create new homework (with optional image)
export const createHomework = async (req, res) => {
  try {
    const { className, subject, date, dueDate, title, description, teacherId } =
      req.body;

    if (!className || !subject || !date || !description) {
      return res
        .status(400)
        .json({
          success: false,
          error: "className, subject, date, description kerak",
        });
    }

    const homeworkData = {
      className,
      subject,
      teacherId: teacherId || req.user.id,
      date,
      dueDate: dueDate || null,
      title: title || "",
      description,
    };

    // If file was uploaded via multer-cloudinary
    if (req.file) {
      homeworkData.fileUrl = req.file.path;
      homeworkData.filePublicId = req.file.filename;

      // Determine fileType
      const filename = req.file.originalname.toLowerCase();
      if (filename.endsWith(".pdf")) {
        homeworkData.fileType = "pdf";
      } else if (filename.endsWith(".doc") || filename.endsWith(".docx")) {
        homeworkData.fileType = "word";
      } else {
        homeworkData.fileType = "image";
      }
    }

    const homework = new Homework(homeworkData);
    await homework.save();
    await homework.populate("teacherId", "fullName username");

    res.status(201).json({ success: true, homework });
  } catch (error) {
    console.error("❌ CREATE HOMEWORK ERROR:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create homework" });
  }
};

// Get homework by class
export const getHomeworkByClass = async (req, res) => {
  try {
    const { className } = req.query;

    if (!className) {
      return res.status(400).json({ success: false, error: "className kerak" });
    }

    const homeworkList = await Homework.find({ className })
      .populate("teacherId", "fullName username")
      .sort({ date: -1, createdAt: -1 });

    // Generate accessible URLs for files
    const homework = homeworkList.map((hw) => {
      const obj = hw.toObject();
      const rawUrl = obj.fileUrl || obj.imageUrl;
      if (rawUrl) {
        try {
          // Extract public_id from Cloudinary URL
          const match = rawUrl.match(
            /\/(?:image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/,
          );
          if (match) {
            const publicId = match[1];
            const isRaw = rawUrl.includes("/raw/upload/");
            const resourceType = isRaw ? "raw" : "image";

            // Generate a public URL (type: upload = publicly accessible)
            const publicUrl = cloudinary.url(publicId, {
              resource_type: resourceType,
              type: "upload",
              sign_url: false,
            });
            if (obj.fileUrl) obj.fileUrl = publicUrl;
            if (obj.imageUrl) obj.imageUrl = publicUrl;
          }
        } catch (e) {
          console.warn("URL generation failed:", e.message);
        }
      }
      return obj;
    });

    res.json({ success: true, homework });
  } catch (error) {
    console.error("❌ GET HOMEWORK ERROR:", error);
    res.status(500).json({ success: false, error: "Failed to fetch homework" });
  }
};

// Update homework (with optional image replacement)
export const updateHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subject,
      date,
      dueDate,
      title,
      description,
      removeImage,
      teacherId,
    } = req.body;

    const existing = await Homework.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Homework topilmadi" });
    }

    const updateData = {
      subject,
      date,
      dueDate,
      title,
      description,
      teacherId: teacherId || existing.teacherId,
    };

    // New file uploaded → delete old one from Cloudinary
    if (req.file) {
      const oldPublicId = existing.filePublicId || existing.imagePublicId;
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (e) {
          console.error("Cloudinary delete error:", e);
        }
      }
      updateData.fileUrl = req.file.path;
      updateData.filePublicId = req.file.filename;

      // Determine fileType
      const filename = req.file.originalname.toLowerCase();
      if (filename.endsWith(".pdf")) {
        updateData.fileType = "pdf";
      } else if (filename.endsWith(".doc") || filename.endsWith(".docx")) {
        updateData.fileType = "word";
      } else {
        updateData.fileType = "image";
      }

      // Clean up legacy fields on update
      updateData.imageUrl = null;
      updateData.imagePublicId = null;
    }

    // User explicitly requested to remove file
    const shouldRemove =
      removeImage === "true" ||
      removeImage === true ||
      req.body.removeFile === "true" ||
      req.body.removeFile === true;
    if (shouldRemove) {
      const oldPublicId = existing.filePublicId || existing.imagePublicId;
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (e) {
          console.error("Cloudinary delete error:", e);
        }
      }
      updateData.fileUrl = null;
      updateData.filePublicId = null;
      updateData.fileType = null;
      updateData.imageUrl = null;
      updateData.imagePublicId = null;
    }

    const homework = await Homework.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("teacherId", "fullName username");

    res.json({ success: true, homework });
  } catch (error) {
    console.error("❌ UPDATE HOMEWORK ERROR:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update homework" });
  }
};

// Delete homework (also delete image from Cloudinary)
export const deleteHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id);

    if (!homework) {
      return res
        .status(404)
        .json({ success: false, error: "Homework topilmadi" });
    }

    // Delete file from Cloudinary if exists
    const publicId = homework.filePublicId || homework.imagePublicId;
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.error("Cloudinary delete error:", e);
      }
    }

    await Homework.findByIdAndDelete(id);
    res.json({ success: true, message: "Homework o'chirildi" });
  } catch (error) {
    console.error("❌ DELETE HOMEWORK ERROR:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete homework" });
  }
};
