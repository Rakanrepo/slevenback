import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Moyasar Configuration
  moyasar: {
    secretKey: process.env.MOYASAR_SECRET_KEY || '',
    publicKey: process.env.MOYASAR_PUBLIC_KEY || '',
    webhookSecret: process.env.MOYASAR_WEBHOOK_SECRET || '',
    apiUrl: 'https://api.moyasar.com/v1',
  },

  // Resend Email Configuration
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
  },

  // Omniful Configuration
  omniful: {
    apiUrl: process.env.OMNIFUL_API_URL || 'https://api.omniful.tech',
    apiKey: process.env.OMNIFUL_API_KEY || '',
  },

  // File Upload Configuration
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
};
