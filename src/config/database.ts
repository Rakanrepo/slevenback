import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  NODE_ENV = 'development'
} = process.env;

// Create database connection pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  host: DB_HOST,
  port: parseInt(DB_PORT || '5432'),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('Database pool closed');
};
