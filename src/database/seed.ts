import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database.js';

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding database...');
    
    // Read and execute seed data
    const seedPath = join(process.cwd(), 'src', 'database', 'seed.sql');
    const seed = readFileSync(seedPath, 'utf8');
    
    await client.query(seed);
    console.log('✅ Database seeded successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Database seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
