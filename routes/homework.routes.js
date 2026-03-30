import express from 'express';
import { createHomework, getHomeworkByClass, updateHomework, deleteHomework } from '../controllers/homework.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadHomeworkFile } from '../config/cloudinary.js';
import Homework from '../models/Homework.js';
import axios from 'axios';

const router = express.Router();

// Proxy: fetch Cloudinary file server-side and serve with correct MIME type
router.get('/proxy-file/:id', async (req, res) => {
    try {
        let hwId = req.params.id;

        // Sanitize ID
        if (hwId.startsWith('p_')) hwId = hwId.substring(2);
        if (hwId.includes(':')) hwId = hwId.split(':')[0];

        console.log(`🔍 Proxying file for HW ID: ${hwId}`);

        const hw = await Homework.findById(hwId);
        if (!hw) {
            console.warn(`⚠️ Homework not found for ID: ${hwId}`);
            return res.status(404).json({ error: 'Not found' });
        }

        const fileUrl = hw.fileUrl || hw.imageUrl;
        if (!fileUrl) return res.status(404).json({ error: 'No file URL' });

        console.log(`📥 Fetching from Cloudinary: ${fileUrl}`);

        // --- Determine MIME type and extension accurately ---
        const fileType = (hw.fileType || '').toLowerCase();
        const urlLower = fileUrl.toLowerCase();

        let mimeType = 'application/octet-stream';
        let ext = 'bin';

        if (fileType === 'pdf' || urlLower.includes('.pdf')) {
            mimeType = 'application/pdf';
            ext = 'pdf';
        } else if (fileType === 'word' || urlLower.match(/\.docx?/)) {
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            ext = urlLower.endsWith('.doc') ? 'doc' : 'docx';
        } else if (fileType === 'image' || urlLower.match(/\.(jpg|jpeg)$/)) {
            mimeType = 'image/jpeg';
            ext = 'jpg';
        } else if (urlLower.endsWith('.png')) {
            mimeType = 'image/png';
            ext = 'png';
        } else if (urlLower.endsWith('.gif')) {
            mimeType = 'image/gif';
            ext = 'gif';
        } else if (urlLower.endsWith('.webp')) {
            mimeType = 'image/webp';
            ext = 'webp';
        }

        // Build safe filename (supports Uzbek and Cyrillic chars)
        const rawTitle = hw.title || `vazifa_${hw._id}`;
        const safeTitle = rawTitle.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 60);
        const finalFileName = `${safeTitle}.${ext}`;

        // Fetch from Cloudinary
        const response = await axios.get(fileUrl, {
            responseType: 'stream',
            timeout: 15000,
            headers: { 'Accept': '*/*' }
        });

        // Set correct headers so browser opens PDF inline
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(finalFileName)}`);
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        // Allow caching
        res.setHeader('Cache-Control', 'public, max-age=3600');

        response.data.pipe(res);
    } catch (e) {
        console.error('❌ Proxy file error:', e.message);
        res.status(500).json({ error: `File fetch failed: ${e.message}` });
    }
});

// Create homework — teacher/admin only (with optional file upload)
router.post('/', authenticateToken, requireRole('teacher', 'admin'), uploadHomeworkFile.single('file'), createHomework);

// Get homework by class
router.get('/', authenticateToken, getHomeworkByClass);

// Update homework (with optional file replacement)
router.put('/:id', authenticateToken, requireRole('teacher', 'admin'), uploadHomeworkFile.single('file'), updateHomework);

// Delete homework
router.delete('/:id', authenticateToken, requireRole('teacher', 'admin'), deleteHomework);

export default router;
