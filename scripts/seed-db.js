require('dotenv').config({ path: './.env.local' }); 
const { db } = require('@vercel/postgres');
const {
  users,
  pages,
} = require('../app/lib/placeholder-data.js');
const bcrypt = require('bcrypt');

async function seedUsers(client) {
  try {
    await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    // Create the "users" table if it doesn't exist
    const createTable = await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    console.log(`Created "users" table`);

    // Insert data into the "users" table
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return client.sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
      }),
    );

    console.log(`Seeded ${insertedUsers.length} users`);

    return {
      createTable,
      users: insertedUsers,
    };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedPages(client) {
  try {
    await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // Create the "outlines" table if it doesn't exist
    const createTable = await client.sql`
    CREATE TABLE IF NOT EXISTS pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    value TEXT NOT NULL,
    userId UUID NOT NULL
  );
`;

    console.log(`Created "pages" table`);

    // Insert data into the "pages" table
    const insertedPages = await Promise.all(
      pages.map(
        (page) => client.sql`
        INSERT INTO pages (id, value, userId)
        VALUES (${page.id}, ${page.value}, ${page.userId})
        ON CONFLICT (id) DO NOTHING;
      `,
      ),
    );

    console.log(`Seeded ${insertedPages.length} user outlines`);

    return {
      createTable,
      pages: insertedPages,
    };
  } catch (error) {
    console.error('Error seeding pages:', error);
    throw error;
  }
}

async function main() {
  const client = await db.connect();

  await seedUsers(client);
  await seedPages(client);
  
  await client.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});
