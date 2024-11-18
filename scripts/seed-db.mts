import { seedUsers, seedPages } from '../scripts/seed-inserts.js';

let envfile;
if (process.env.NODE_ENV === 'production') {
  console.log('refusing to seed production database');
  process.exit(1);
} else if (process.env.NODE_ENV === 'development') {
  console.log('seeding development database');
  envfile = './.env.development.local';
} else if (process.env.NODE_ENV === 'test') {
  console.log('seeding test database');
  envfile = './.env.test.local';
}
import dotenv from 'dotenv';
import { db } from './seed-db-wrapper.mts';
import {
  users,
  pages,
} from '../lib/placeholder-data.js';

dotenv.config({ path: envfile });

async function main() {
  const client = await db.pool.connect();
  
  const clientWithSql = {
    ...client,
    sql: db.sql.bind(null)
  };

  await seedUsers(clientWithSql, users);
  await seedPages(clientWithSql, pages);
  
  await client.release();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});
