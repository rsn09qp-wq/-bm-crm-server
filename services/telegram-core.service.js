import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Student from '../models/Student.js';
import TelegramUser from '../models/TelegramUser.js';
import NotificationLog from '../models/NotificationLog.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot;

if (token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const webhookUrl = process.env.WEBHOOK_URL;

    if (isProduction && webhookUrl) {
        // Production: Webhook mode (for Render/Cloud deployment)
        bot = new TelegramBot(token, { webHook: true });
        const webhookPath = '/webhook/telegram';
        bot.setWebHook(`${webhookUrl}${webhookPath}`)
            .then(() => {
                console.log('🤖 Telegram Bot initialized (WEBHOOK MODE)');
                console.log(`📡 Webhook URL: ${webhookUrl}${webhookPath}`);
            })
            .catch((err) => {
                console.error('❌ Failed to set webhook:', err.message);
            });
    } else {
        // Development: Polling mode (for local development)
        bot = new TelegramBot(token, { polling: true });
        console.log('🤖 Telegram Bot initialized (POLLING MODE - Development)');
    }

    // Bot started - save user and send welcome message
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const user = msg.from;

        try {
            // Save or update user in database
            await TelegramUser.findOneAndUpdate(
                { chatId: chatId.toString() },
                {
                    chatId: chatId.toString(),
                    username: user.username,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    isActive: true,
                    subscribedAt: new Date()
                },
                { upsert: true, new: true }
            );

            const userName = user.first_name || user.username || 'Foydalanuvchi';

            let welcomeMsg = `━━━━━━━━━━━━━━━━━━━━\n`;
            welcomeMsg += `🏛 *BM MAKTAB | CRM TIZIMI* 🏛\n`;
            welcomeMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

            welcomeMsg += `Assalomu alaykum, *${userName}*!\n\n`;
            welcomeMsg += `Ushbu bot orqali siz *BM Maktab* axborot tizimi tomonidan yuboriladigan rasmiy xabarnomalarni qabul qilib borasiz. Obuna muvaffaqiyatli amalga oshirildi.\n\n`;

            welcomeMsg += `📊 *ASOSIY XIZMATLAR:* \n`;
            welcomeMsg += `• Kunlik davomat hisobotlari\n`;
            welcomeMsg += `• Rasmiy e'lonlar va xabarnomalar\n`;
            welcomeMsg += `• Ichki tadbir va majlislar jadvali\n\n`;

            welcomeMsg += `──────────────────\n`;
            welcomeMsg += `✨ *Holat:* Tizim to'liq faoliyat yuritmoqda.\n`;
            welcomeMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
            welcomeMsg += `🤖 *BM CRM Bot* | v2.0.2`;

            bot.sendMessage(chatId, welcomeMsg, {
                parse_mode: 'Markdown'
            });

            console.log(`✅ Yangi foydalanuvchi qo'shildi: ${userName} (${chatId})`);
        } catch (error) {
            console.error('❌ Error saving telegram user:', error);
            bot.sendMessage(chatId, `Assalomu alaykum! Bot ishga tushdi.\nSizning Chat ID: ${chatId}`);
        }
    });

    // Stop command - deactivate user
    bot.onText(/\/stop/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            await TelegramUser.findOneAndUpdate(
                { chatId: chatId.toString() },
                { isActive: false }
            );

            let stopMsg = `━━━━━━━━━━━━━━━━━━━━\n`;
            stopMsg += `🔕 *OBUNA BEKOR QILINDI*\n`;
            stopMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            stopMsg += `Siz xabarnomalarni olishni to'xtatdingiz. Endi CRM tizimidan bildirishnomalar kelmaydi.\n\n`;
            stopMsg += `🔄 *Qayta ulanish:* Xohlagan vaqtingizda /start buyrug'ini yuboring.\n\n`;
            stopMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
            stopMsg += `👋 *Xayr, salomat bo'ling!*`;

            bot.sendMessage(chatId, stopMsg, { parse_mode: 'Markdown' });

            console.log(`❌ Foydalanuvchi chiqib ketdi: ${chatId}`);
        } catch (error) {
            console.error('❌ Error deactivating user:', error);
        }
    });
}

/**
 * Send message to all active Telegram users
 * @param {string} message - Message to send
 * @returns {Promise<{success: boolean, sent: number, failed: number}>}
 */
async function broadcastMessage(message) {
    try {
        const activeUsers = await TelegramUser.find({ isActive: true });
        console.log(`📢 Broadcasting to ${activeUsers.length} active users...`);

        let sent = 0;
        let failed = 0;

        for (const user of activeUsers) {
            try {
                // Log message length for debugging
                console.log(`📡 Sending message to ${user.chatId} (length: ${message.length} chars)`);
                await bot.sendMessage(user.chatId, message, { parse_mode: 'Markdown' });
                sent++;
            } catch (error) {
                console.error(`❌ Failed to send to ${user.chatId}:`, error.message);
                if (error.response && error.response.body) {
                    console.error(`📝 Telegram Error Details:`, JSON.stringify(error.response.body));
                }
                failed++;

                // If user blocked the bot, deactivate them
                if (error.response && error.response.statusCode === 403) {
                    await TelegramUser.findOneAndUpdate(
                        { chatId: user.chatId },
                        { isActive: false }
                    );
                    console.log(`🚫 User ${user.chatId} blocked the bot, deactivated`);
                }
            }
        }

        console.log(`✅ Broadcast complete: ${sent} sent, ${failed} failed`);
        return { success: true, sent, failed };
    } catch (error) {
        console.error('❌ Broadcast error:', error);
        return { success: false, sent: 0, failed: 0, error: error.message };
    }
}

/**
 * Send attendance report to Telegram
 * @param {string} role - 'student' or 'teacher'
 */
export const sendAttendanceReport = async (role = 'student') => {
    try {
        console.log(`📊 Starting attendance report for role: ${role}`);

        if (!bot) {
            console.error('❌ Telegram Bot is not initialized (missing token)');
            return { success: false, error: 'Telegram Bot not initialized' };
        }

        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) {
            console.warn('⚠️ TELEGRAM_CHAT_ID is not set in .env');
            return { success: false, error: 'TELEGRAM_CHAT_ID not set' };
        }

        const today = new Date().toISOString().split('T')[0];

        // Role label mapping
        const roleLabelMap = {
            'student': 'O\'quvchilar',
            'teacher': 'O\'qituvchilar',
            'staff': 'Hodimlar'
        };
        const roleLabel = roleLabelMap[role] || 'Xodimlar';

        // Emoji mapping
        const emojiMap = {
            'student': '🎓',
            'teacher': '👨‍🏫',
            'staff': '👔'
        };
        const emoji = emojiMap[role] || '👤';

        // Fetch all active employees/students of this role first
        let allEmployees;
        if (role === 'student') {
            allEmployees = await Student.find({ status: 'active' });
            console.log(`📚 Found ${allEmployees.length} active students`);
        } else if (role === 'teacher') {
            allEmployees = await Employee.find({ role: 'teacher', status: 'active' });
            console.log(`👨‍🏫 Found ${allEmployees.length} active teachers`);
        } else if (role === 'staff') {
            allEmployees = await Employee.find({
                $and: [
                    { status: 'active' },
                    { role: { $ne: 'teacher' } },
                    { role: { $ne: 'student' } }
                ]
            });
            console.log(`👔 Found ${allEmployees.length} active staff members`);
        } else {
            allEmployees = await Employee.find({ role: role, status: 'active' });
        }

        const total = allEmployees.length;
        const hikvisionIds = allEmployees.map(emp => emp.hikvisionEmployeeId).filter(id => id);

        let records = [];
        if (hikvisionIds.length > 0) {
            records = await Attendance.find({
                date: today,
                hikvisionEmployeeId: { $in: hikvisionIds }
            });
        }

        const presentRecords = records.filter(r => r.firstCheckIn);
        const presentCount = presentRecords.length;
        const presentIds = new Set(presentRecords.map(r => r.hikvisionEmployeeId));
        const absentees = allEmployees.filter(emp => !presentIds.has(emp.hikvisionEmployeeId));
        const absentCount = absentees.length;

        const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

        // Helper to escape markdown special characters (Standard Markdown/V1)
        const escapeMd = (text) => {
            if (!text) return "";
            // Standard Markdown only needs: *, _, `, [
            return text.toString().replace(/([*_`\[])/g, "\\$1");
        };

        const now = new Date();

        let message = `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `${emoji} *${roleLabel.toUpperCase()} DAVOMATI* ${emoji}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        message += `📅 *Sana:* \`${today}\`\n`;
        message += `📈 *Davomat ko'rsatkichi:* ${attendanceRate}%\n`;
        message += `${'🟢'.repeat(Math.round(attendanceRate / 10))}${'⚪'.repeat(10 - Math.round(attendanceRate / 10))}\n\n`;

        message += `📊 *STATISTIKA:*\n`;
        if (role === 'student') {
            const studentsByClass = {};
            const studentMap = {};
            allEmployees.forEach(s => {
                const cls = s.className || "Noma'lum";
                if (!studentsByClass[cls]) studentsByClass[cls] = { all: [], present: [], absent: [] };
                studentsByClass[cls].all.push(s);
                if (s.hikvisionEmployeeId) studentMap[s.hikvisionEmployeeId] = s;
            });

            records.forEach(r => {
                if (!r.firstCheckIn) return;
                const student = studentMap[r.hikvisionEmployeeId];
                if (student) {
                    const cls = student.className || "Noma'lum";
                    if (studentsByClass[cls]) studentsByClass[cls].present.push(r);
                }
            });

            Object.keys(studentsByClass).forEach(cls => {
                const pIds = new Set(studentsByClass[cls].present.map(p => p.hikvisionEmployeeId));
                studentsByClass[cls].absent = studentsByClass[cls].all.filter(s => !pIds.has(s.hikvisionEmployeeId));
            });

            message += `👥 Jami o'quvchi: *${total}*\n`;
            message += `✅ Kelgan: *${presentCount}*\n`;
            message += `❌ Kelmagan: *${absentCount}*\n`;
            message += `\n──────────────────\n\n`;

            const sortedClasses = Object.keys(studentsByClass).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            for (const cls of sortedClasses) {
                const data = studentsByClass[cls];
                const header = `*📍 ${escapeMd(cls)} sinfi:* (${data.present.length}/${data.all.length})\n`;
                if (message.length + header.length > 3500) { message += `... _va boshqa sinflar (limit)_`; break; }
                message += header;
                if (data.absent.length > 0) {
                    message += `🚫 _Kelmagan (${data.absent.length}):_\n`;
                    for (const s of data.absent) {
                        const line = `  • ${escapeMd(s.name)}\n`;
                        if (message.length + line.length > 3900) { message += `  ... va boshqalar\n`; break; }
                        message += line;
                    }
                } else { message += `✅ _Hamma kelgan_\n`; }
                message += `\n`;
            }
        } else {
            message += `👥 Jami ${role === 'teacher' ? 'ustoz' : 'xodim'}: *${total}*\n`;
            message += `✅ Kelgan: *${presentCount}*\n`;
            message += `❌ Kelmagan: *${absentCount}*\n`;
            message += `\n──────────────────\n\n`;

            if (presentCount > 0) {
                message += `*📍 KELGANLAR RO'YXATI:*\n`;
                const sortedPresent = [...records].filter(r => r.firstCheckIn).sort((a, b) => a.firstCheckIn.localeCompare(b.firstCheckIn));

                sortedPresent.forEach(r => {
                    const checkIn = r.firstCheckIn || '--:--';
                    const checkOut = r.lastCheckOut || '--:--';
                    message += `🔹 *${escapeMd(r.name)}*\n`;
                    message += `   └─ 🛫 \`${checkIn}\`  ➡️  🛬 \`${checkOut}\`\n`;
                });
                message += `\n`;
            }

            if (absentCount > 0) {
                message += `*🚫 KELMAGANLAR (${absentCount}):*\n`;
                absentees.forEach(emp => {
                    message += `➖ _${escapeMd(emp.name)}_\n`;
                });
                message += `\n`;
            }
        }

        message += `━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🤖 *BM CRM* | ${new Date().toLocaleTimeString('uz-UZ', { timeZone: process.env.TIMEZONE || undefined, hour: '2-digit', minute: '2-digit' })}`;

        console.log('--- GENERATED TELEGRAM MESSAGE (NEW CORE) ---');
        console.log(message);
        console.log('---------------------------------------------');

        const broadcastResult = await broadcastMessage(message);

        try {
            await NotificationLog.create({
                type: 'telegram', category: 'attendance', target: role,
                title: `${roleLabel} Davomati`,
                message: message.substring(0, 500),
                status: broadcastResult.sent > 0 ? 'sent' : 'failed',
                recipients: { sent: broadcastResult.sent, failed: broadcastResult.failed, total: broadcastResult.sent + broadcastResult.failed },
                metadata: { presentCount, absentCount, totalCount: total, attendanceRate }
            });
        } catch (e) { console.error('Log error:', e); }

        return { success: true, present: presentCount, absent: absentCount, total, broadcast: broadcastResult };
    } catch (error) {
        console.error('❌ Error sending Telegram report:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send class-specific attendance report to Telegram
 * @param {string} className - The name of the class (e.g., "9-A")
 */
export const sendClassAttendanceReport = async (className) => {
    try {
        if (!bot) return { success: false, error: 'Bot initialization failed' };

        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) return { success: false, error: 'TELEGRAM_CHAT_ID not set' };

        const today = new Date().toISOString().split('T')[0];

        // Fetch students in this class
        const students = await Student.find({ className: className, status: 'active' });
        if (students.length === 0) {
            return { success: false, error: `Sinfda o'quvchilar topilmadi: ${className}` };
        }

        const studentIds = students.map(s => s.hikvisionEmployeeId);
        const records = await Attendance.find({
            date: today,
            hikvisionEmployeeId: { $in: studentIds }
        });

        const total = students.length;
        const presentRecords = records.filter(r => r.firstCheckIn);
        const presentCount = presentRecords.length;
        const absentCount = total - presentCount;

        const presentHikIds = new Set(presentRecords.map(r => r.hikvisionEmployeeId));
        const absentees = students.filter(s => !presentHikIds.has(s.hikvisionEmployeeId));

        const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
        const progressBar = '🟢'.repeat(Math.round(attendanceRate / 10)) + '⚪'.repeat(10 - Math.round(attendanceRate / 10));

        let message = `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🏫 *${className.toUpperCase()} SINFI DAVOMATI* 🏫\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        message += `📅 *Sana:* \`${today}\`\n`;
        message += `📈 *Davomat ko'rsatkichi:* ${attendanceRate}%\n`;
        message += `${progressBar}\n\n`;

        message += `📊 *STATISTIKA:*\n`;
        message += `👥 Jami o'quvchi: *${total}*\n`;
        message += `✅ Kelgan: *${presentCount}*\n`;
        message += `❌ Kelmagan: *${absentCount}*\n`;
        message += `\n──────────────────\n\n`;

        if (presentCount > 0) {
            message += `*📍 KELGANLAR RO'YXATI:*\n`;
            const sortedRecords = [...presentRecords].sort((a, b) => a.firstCheckIn.localeCompare(b.firstCheckIn));

            sortedRecords.forEach(r => {
                const checkIn = r.firstCheckIn || '--:--';
                const checkOut = r.lastCheckOut || '--:--';
                message += `🔹 *${r.name}*\n`;
                message += `   └─ 🛫 \`${checkIn}\`  ➡️  🛬 \`${checkOut}\`\n`;
            });
            message += `\n`;
        }

        if (absentCount > 0) {
            message += `*🚫 KELMAGANLAR (${absentCount}):*\n`;
            absentees.forEach(s => {
                message += `➖ _${s.name}_\n`;
            });
        }

        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🤖 *BM CRM Tizimi* | ${new Date().toLocaleTimeString('uz-UZ', { timeZone: process.env.TIMEZONE || undefined, hour: '2-digit', minute: '2-digit' })}`;

        const broadcastResult = await broadcastMessage(message);
        console.log(`✅ Class attendance report broadcast: ${broadcastResult.sent} sent, ${broadcastResult.failed} failed`);
        return { success: true, present: presentCount, absent: absentCount, total, broadcast: broadcastResult };
    } catch (error) {
        console.error('❌ Error sending class report:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send custom message to Telegram
 * @param {string} title - Message title
 * @param {string} message - Message content
 * @param {string} recipient - Target audience (e.g., "Barcha O'quvchilar", "9-A sinfi")
 */
export const sendCustomMessage = async (title, message, recipient = "Barcha") => {
    try {
        if (!bot) {
            console.error('❌ Telegram Bot is not initialized');
            return { success: false, error: 'Bot not initialized' };
        }

        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) {
            console.warn('⚠️ TELEGRAM_CHAT_ID is not set');
            return { success: false, error: 'Chat ID not set' };
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('uz-UZ', {
            timeZone: 'Asia/Tashkent',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('uz-UZ', {
            timeZone: 'Asia/Tashkent',
            hour: '2-digit',
            minute: '2-digit'
        });

        let telegramMessage = `━━━━━━━━━━━━━━━━━━━━\n`;
        telegramMessage += `📢 *${title.toUpperCase()}* 📢\n`;
        telegramMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        telegramMessage += `👥 *Qabul qiluvchi:* ${recipient}\n`;
        telegramMessage += `📅 *Sana:* ${dateStr}\n`;
        telegramMessage += `🕐 *Vaqt:* ${timeStr}\n\n`;

        telegramMessage += `──────────────────\n\n`;
        telegramMessage += `${message}\n\n`;
        telegramMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
        telegramMessage += `🤖 *BM CRM Tizimi*`;

        const broadcastResult = await broadcastMessage(telegramMessage);
        console.log(`✅ Custom message "${title}" broadcast: ${broadcastResult.sent} sent, ${broadcastResult.failed} failed`);

        return { success: true, title, recipient, broadcast: broadcastResult };
    } catch (error) {
        console.error('❌ Error sending custom message:', error);
        return { success: false, error: error.message };
    }
};

export default bot;
