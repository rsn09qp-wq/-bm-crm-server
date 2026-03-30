import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';

class NotificationService {
    // Create daily attendance notification for all admin/director users
    async createDailyAttendanceNotification(targetDate = null) {
        try {
            // If targetDate is provided, use it. Otherwise, use yesterday by default.
            const reportDate = targetDate ? new Date(targetDate) : new Date();
            if (!targetDate) {
                reportDate.setDate(reportDate.getDate() - 1);
            }
            reportDate.setHours(0, 0, 0, 0);

            const nextDay = new Date(reportDate);
            nextDay.setDate(nextDay.getDate() + 1);

            console.log(`📊 Generating attendance report for: ${reportDate.toISOString().split('T')[0]}`);

            // Get attendance stats for the target date
            const attendances = await Attendance.find({
                date: {
                    $gte: reportDate,
                    $lt: nextDay
                }
            }).populate('employeeId');

            // Calculate statistics
            const stats = {
                total: 0,
                present: 0,
                absent: 0,
                students: { total: 0, present: 0 },
                teachers: { total: 0, present: 0 },
                staff: { total: 0, present: 0 }
            };

            attendances.forEach(att => {
                if (!att.employeeId) return;

                stats.total++;
                if (att.status === 'present' || att.status === 'late') {
                    stats.present++;
                } else {
                    stats.absent++;
                }

                const role = att.employeeId.role;
                if (role === 'student') {
                    stats.students.total++;
                    if (att.status === 'present' || att.status === 'late') {
                        stats.students.present++;
                    }
                } else if (role === 'teacher') {
                    stats.teachers.total++;
                    if (att.status === 'present' || att.status === 'late') {
                        stats.teachers.present++;
                    }
                } else {
                    stats.staff.total++;
                    if (att.status === 'present' || att.status === 'late') {
                        stats.staff.present++;
                    }
                }
            });

            const attendanceRate = stats.total > 0
                ? ((stats.present / stats.total) * 100).toFixed(1)
                : 0;

            // Get all admin and director users
            const adminUsers = await User.find({
                role: { $in: ['admin', 'director'] }
            });

            const isToday = reportDate.toDateString() === new Date().toDateString();
            const dateStr = reportDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
            const title = isToday ? `Bugungi Davomat (${dateStr})` : `Kechagi Davomat (${dateStr})`;

            // Create notification for each admin/director
            const notifications = adminUsers.map(user => ({
                userId: user._id,
                type: 'attendance',
                title: title,
                message: `Hisobot: ${stats.total} kishidan ${stats.present} kishi keldi (${attendanceRate}%). ${stats.absent} kishi kelmadi.`,
                data: {
                    date: reportDate.toISOString().split('T')[0],
                    totalPeople: stats.total,
                    present: stats.present,
                    absent: stats.absent,
                    attendanceRate: parseFloat(attendanceRate),
                    breakdown: stats
                },
                read: false
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
                console.log(`✅ Created ${notifications.length} attendance notifications for ${yesterday.toISOString().split('T')[0]}`);
            }

            return { success: true, count: notifications.length };
        } catch (error) {
            console.error('Error creating attendance notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user's notifications (paginated)
    async getUserNotifications(userId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;

            const notifications = await Notification.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await Notification.countDocuments({ userId });

            return {
                success: true,
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Get unread count for user
    async getUnreadCount(userId) {
        try {
            const count = await Notification.countDocuments({
                userId,
                read: false
            });

            return { success: true, count };
        } catch (error) {
            console.error('Error getting unread count:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark notification as read
    async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, userId },
                { read: true },
                { new: true }
            );

            if (!notification) {
                return { success: false, error: 'Notification not found' };
            }

            return { success: true, notification };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark all notifications as read
    async markAllAsRead(userId) {
        try {
            const result = await Notification.updateMany(
                { userId, read: false },
                { read: true }
            );

            return { success: true, modifiedCount: result.modifiedCount };
        } catch (error) {
            console.error('Error marking all as read:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete notification
    async deleteNotification(notificationId, userId) {
        try {
            const notification = await Notification.findOneAndDelete({
                _id: notificationId,
                userId
            });

            if (!notification) {
                return { success: false, error: 'Notification not found' };
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Create notification when a new student is added
    async createNewStudentNotification(student) {
        try {
            // Get all admin and director users
            const adminUsers = await User.find({
                role: { $in: ['admin', 'director'] }
            });

            // Create notification for each admin/director
            const notifications = adminUsers.map(user => ({
                userId: user._id,
                type: 'announcement',
                title: 'Yangi O\'quvchi Qo\'shildi',
                message: `Yangi o'quvchi ${student.name} ${student.className || student.class} sinfiga muvaffaqiyatli qo'shildi.`,
                data: {
                    studentId: student._id,
                    studentName: student.name,
                    className: student.className || student.class,
                    type: 'new_student'
                },
                read: false
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
                console.log(`✅ Created ${notifications.length} notifications for new student: ${student.name}`);
            }

            return { success: true, count: notifications.length };
        } catch (error) {
            console.error('Error creating new student notification:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new NotificationService();
