import app from './app.js';
import { connectDB } from './config/database.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[RecoverAI] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    console.error('[Server Startup Error] Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();
