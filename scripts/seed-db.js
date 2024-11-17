const { seedUsers, seedPages } = require('../scripts/seed-inserts.js');

let envfile;
if (process.env.NODE_ENV === 'production') {
  console.log('refusing to seed production database');
  process.exit(1);
} else if (process.env.NODE_ENV === 'development') {
  envfile = './.env.development.local';
}
require('dotenv').config({ path: envfile }); 
const { db } = require('@/lib/dbwrapper');
const {
  users,
  pages,
} = require('@/lib/placeholder-data.js');

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
