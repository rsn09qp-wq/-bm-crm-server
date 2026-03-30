import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const mime = file.mimetype || '';
        const isPdf = mime === 'application/pdf';
        const isDoc = mime.includes('word') || mime.includes('officedocument');

        // Get original extension to preserve it in public_id
        const origName = file.originalname || '';
        const ext = origName.split('.').pop().toLowerCase();
        const baseName = origName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const uniqueSuffix = Date.now();

        return {
            folder: 'homework_files',
            // For PDFs/docs use 'raw' resource type (required for non-image files)
            resource_type: (isPdf || isDoc) ? 'raw' : 'image',
            type: 'upload',
            // Preserve extension in public_id so URL has correct extension
            public_id: `${baseName}_${uniqueSuffix}.${ext}`,
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'],
        };
    }
});

export const uploadHomeworkFile = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

export { cloudinary };
