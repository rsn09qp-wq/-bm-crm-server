import { sendAttendanceReport } from './services/telegram.service.js';

console.log('Running diagnostic test for Telegram Service...');
console.log('Path to service: ./services/telegram.service.js');

async function run() {
    try {
        console.log('Calling sendAttendanceReport("teacher")...');
        // We can't easily capture the output since it sends to Telegram, 
        // but we can check if it runs without error and observe the console logs 
        // if I added any in the service file.
        await sendAttendanceReport('teacher');
        console.log('Function call completed.');
    } catch (error) {
        console.error('Error:', error);
    }
}

run();
