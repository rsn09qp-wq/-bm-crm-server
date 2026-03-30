import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * PUT /api/users/profile
 * Update user profile (email, fullName)
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { email, fullName } = req.body;

        // Validation
        if (!email || !fullName) {
            return res.status(400).json({
                error: 'Email va to\'liq ism talab qilinadi'
            });
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({
            email,
            _id: { $ne: req.user.id }
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'Bu email allaqachon boshqa foydalanuvchi tomonidan ishlatilmoqda'
            });
        }

        // Update user
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { email, fullName },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                error: 'User topilmadi'
            });
        }

        res.json({
            success: true,
            message: 'Profil muvaffaqiyatli yangilandi',
            user
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Server xatosi',
            message: error.message
        });
    }
});

/**
 * PUT /api/users/staff/:employeeId/reset-password
 * Reset staff member password (Admin only)
 */
router.put('/staff/:employeeId/reset-password', authenticateToken, async (req, res) => {
    try {
        // Only admin can reset other people's passwords
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                error: 'Faqat administratorlar parolni yangilashi mumkin'
            });
        }

        const { newPassword } = req.body;
        const { employeeId } = req.params;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                error: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak'
            });
        }

        // Find user by their link to employee
        const user = await User.findOne({ employeeId });
        if (!user) {
            return res.status(404).json({
                error: 'Ushbu xodimga bog\'langan foydalanuvchi topilmadi'
            });
        }

        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Parol muvaffaqiyatli yangilandi'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Server xatosi',
            message: error.message
        });
    }
});

export default router;
