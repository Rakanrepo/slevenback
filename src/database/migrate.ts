import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database.js';

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running database migrations...');
    
    // Read and execute schema
    const schemaPath = join(process.cwd(), 'src', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('✅ Database schema created successfully');
    
    // Read and execute seed data
    const seedPath = join(process.cwd(), 'src', 'database', 'seed.sql');
    const seed = readFileSync(seedPath, 'utf8');
    
    await client.query(seed);
    console.log('✅ Database seeded successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('🎉 All migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
