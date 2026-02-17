import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const RETRY_INTERVAL_MS = 5000;

const connectDB = async (retry = true) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    if (retry) {
      console.log(`Retrying MongoDB connection in ${RETRY_INTERVAL_MS / 1000}s...`);
      setTimeout(() => connectDB(retry), RETRY_INTERVAL_MS);
    } else {
      console.warn('Not retrying MongoDB connection.');
    }
  }
};

export default connectDB;
