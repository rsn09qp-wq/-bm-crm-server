import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB ulanildi\n');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        console.log('📊 BARCHA COLLECTIONLAR:\n');
        console.log('='.repeat(80));

        // Expected collections
        const expectedCollections = [
            'attendances',
            'students',
            'employees',
            'classes',
            'users',
            'notificationlogs',
            'telegramusers'
        ];

        const foundCollections = [];
        const unexpectedCollections = [];

        for (const collection of collections) {
            const name = collection.name;
            const count = await db.collection(name).countDocuments();
            const size = 'N/A';

            const isExpected = expectedCollections.includes(name.toLowerCase());

            if (isExpected) {
                foundCollections.push({ name, count, size });
                console.log(`✅ ${name.padEnd(25)} | Docs: ${String(count).padStart(6)} | Size: ${size} KB`);
            } else {
                unexpectedCollections.push({ name, count, size });
                console.log(`⚠️  ${name.padEnd(25)} | Docs: ${String(count).padStart(6)} | Size: ${size} KB`);
            }
        }

        console.log('='.repeat(80));
        console.log(`\n📈 JAMI: ${collections.length} ta collection\n`);

        if (unexpectedCollections.length > 0) {
            console.log('⚠️  KUTILMAGAN COLLECTIONLAR:');
            console.log('-'.repeat(80));
            unexpectedCollections.forEach(c => {
                console.log(`   • ${c.name} (${c.count} docs, ${c.size} KB)`);
            });
            console.log('\n💡 Bu collectionlar test yoki eski koddan qolgan bo\'lishi mumkin.');
            console.log('   Agar kerak bo\'lmasa, ularni o\'chirish mumkin.\n');
        }

        console.log('✅ KERAKLI COLLECTIONLAR:');
        console.log('-'.repeat(80));
        foundCollections.forEach(c => {
            console.log(`   • ${c.name} (${c.count} docs, ${c.size} KB)`);
        });

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Xato:', err.message);
        process.exit(1);
    });
