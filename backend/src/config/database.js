import mongoose from 'mongoose';


// Connect to MongoDB instance using Mongoose. Supports graceful connection handling and configuration settings.

export const connectDB = async (uri) => {
  const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/recoverai';

  try {
    const conn = await mongoose.connect(connectionUri, {
      autoIndex: true,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    throw error;
  }
};


// Gracefully disconnect from MongoDB instance.

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error(`[MongoDB Disconnect Error]: ${error.message}`);
  }
};
