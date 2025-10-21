import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import { testConnection, closePool } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import capsRoutes from './routes/caps.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import omnifulRoutes from './routes/omniful.js';
import emailRoutes from './routes/email.js';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    console.log('🌐 CORS request from origin:', origin);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:3000',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:5178',
      'https://sleven.sa',
      'https://www.sleven.sa',
      'https://sleven-backend-production.up.railway.app',
      'https://web-production-6f018.up.railway.app',
      'https://slevenlanding-j8vsex7im-rakanrepos-projects.vercel.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS allowed for origin:', origin);
      return callback(null, true);
    }
    
    // For development, allow any localhost origin
    if (origin && origin.startsWith('http://localhost:')) {
      console.log('✅ CORS allowed for localhost origin:', origin);
      return callback(null, true);
    }
    
    console.log('❌ CORS rejected for origin:', origin);
    
    // Temporary: Allow all origins in development for debugging
    if (config.nodeEnv === 'development') {
      console.log('⚠️  Allowing origin in development mode:', origin);
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-moyasar-signature']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      environment: config.nodeEnv
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/caps', capsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/omniful', omnifulRoutes);
app.use('/api/email', emailRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Sleven Caps Store API',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      auth: '/api/auth',
      caps: '/api/caps',
      orders: '/api/orders',
      payments: '/api/payments',
      omniful: '/api/omniful',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🌐 CORS Origin: ${config.corsOrigin}`);
      console.log(`📧 Resend API: ${config.resend.apiKey ? 'Configured' : 'Not configured'}`);
      console.log(`💳 Moyasar API: ${config.moyasar.secretKey ? 'Configured' : 'Not configured'}`);
      console.log(`💳 Moyasar Secret Key: ${config.moyasar.secretKey ? `${config.moyasar.secretKey.substring(0, 10)}...` : 'Not set'}`);
      console.log(`💳 Moyasar Public Key: ${config.moyasar.publicKey ? `${config.moyasar.publicKey.substring(0, 10)}...` : 'Not set'}`);
      console.log(`📦 Omniful API: ${config.omniful.apiKey ? 'Configured' : 'Not configured'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        try {
          await closePool();
          console.log('🔌 Database connections closed');
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
