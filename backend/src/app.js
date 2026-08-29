import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import eventRoutes from './routes/eventRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { sanitizeMiddleware } from './middleware/sanitize.js';

dotenv.config();

const app = express();

// Allowed Origins for CORS Security Hardening
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(sanitizeMiddleware);
app.use('/api/', apiRateLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    service: 'RecoverAI Backend API',
    database: {
      connected: dbConnected,
      name: mongoose.connection.name || 'recoverai',
      host: mongoose.connection.host || '127.0.0.1',
      readyState: mongoose.connection.readyState,
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/payments', paymentRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
});

// Global Error Handling Middleware (Production-hardened)
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Error]:', err.message || err);
  }

  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
});

export default app;
