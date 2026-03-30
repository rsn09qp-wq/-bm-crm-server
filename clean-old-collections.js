import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

// Collections to delete (old/unused)
const COLLECTIONS_TO_DELETE = [
    'teachers',      // Empty - old collection
    'guards',        // Empty - old collection
    'units',         // Empty - old collection
    'soldiers',      // Empty - old collection
    'cooks',         // Empty - old collection
    'organizationconfigs'  // Old config - 3 docs but not used
];

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB ulanildi\n');
        console.log('🗑️  ESKI COLLECTIONLARNI O\'CHIRISH\n');
        console.log('='.repeat(80));

        const db = mongoose.connection.db;

        for (const collectionName of COLLECTIONS_TO_DELETE) {
            try {
                const collections = await db.listCollections({ name: collectionName }).toArray();

                if (collections.length > 0) {
                    const count = await db.collection(collectionName).countDocuments();
                    await db.collection(collectionName).drop();
                    console.log(`✅ O'chirildi: ${collectionName.padEnd(25)} (${count} docs)`);
                } else {
                    console.log(`⚠️  Topilmadi: ${collectionName}`);
                }
            } catch (error) {
                console.error(`❌ Xato (${collectionName}):`, error.message);
            }
        }

        console.log('='.repeat(80));
        console.log('\n✅ Tozalash tugadi!\n');

        // Show remaining collections
        const remainingCollections = await db.listCollections().toArray();
        console.log('📊 QOLGAN COLLECTIONLAR:');
        console.log('-'.repeat(80));

        for (const collection of remainingCollections) {
            const count = await db.collection(collection.name).countDocuments();
            console.log(`   • ${collection.name.padEnd(25)} (${count} docs)`);
        }

        console.log('\n✅ Database tozalandi va faqat kerakli collectionlar qoldi!\n');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Xato:', err.message);
        process.exit(1);
    });
