import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodzippy';

async function removeEmailIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('vendors');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log('  -', JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });

    // Drop the loginEmail unique index if it exists
    try {
      await collection.dropIndex('loginEmail_1');
      console.log('\n✅ Removed loginEmail unique index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('\n✅ No loginEmail index found (already removed or never existed)');
      } else {
        throw error;
      }
    }

    // Check indexes again
    const newIndexes = await collection.indexes();
    console.log('\n📋 Indexes after cleanup:');
    newIndexes.forEach(index => {
      console.log('  -', JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
    });

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeEmailIndex();
