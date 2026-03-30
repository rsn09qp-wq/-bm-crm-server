import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function checkUsers() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected');

        // Define a minimal User model
        const User = mongoose.model('User', new mongoose.Schema({
            username: String,
            role: String,
            email: String,
            fullName: String,
            password: String
        }, { collection: 'users' }));

        const users = await User.find({});
        console.log(`\nFound ${users.length} users:`);
        users.forEach(u => {
            console.log(`USERNAME: ${u.username} | ROLE: ${u.role} | FULLNAME: ${u.fullName}`);
        });

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
