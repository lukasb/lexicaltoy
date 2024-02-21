const { seedUsers, seedPages } = require('../scripts/seed-inserts.js');

require('dotenv').config({ path: './.env.development.local' }); 
const { db } = require('@vercel/postgres');
const {
  users,
  pages,
} = require('./tests-placeholder-data.js');

async function main() {
  const client = await db.connect();

  await seedUsers(client, users);
  await seedPages(client, pages);
  
  await client.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});