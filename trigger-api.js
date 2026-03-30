import axios from 'axios';

const trigger = async () => {
    try {
        console.log("🚀 Triggering API for student attendance report (Timezone Test)...");
        const response = await axios.post('http://localhost:5000/api/notifications/telegram/attendance', {
            role: 'student'
        });
        console.log("📊 API Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("❌ API Call failed:", error.response?.data || error.message);
    }
};

trigger();
