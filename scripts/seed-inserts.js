const bcrypt = require('bcrypt');

module.exports = {
  seedUsers,
  seedPages,
};

async function seedUsers(client, users) {
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

async function seedPages(client, pages) {
  try {
    await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    // Create the "outlines" table if it doesn't exist
    const createTable = await client.sql`
    CREATE TABLE IF NOT EXISTS pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    value TEXT NOT NULL,
    userId UUID NOT NULL,
    title TEXT NOT NULL,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

  console.log(`Created "pages" table`);

    const createLastModified = await client.sql`
    CREATE OR REPLACE FUNCTION update_last_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
    NEW.last_modified = CURRENT_TIMESTAMP;
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    `;

    console.log(`Created "update_last_modified_column" function`);

    const createTrigger = await client.sql`
    CREATE TRIGGER update_pages_last_modified
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified_column();
    `;

    console.log(`Created "update_pages_last_modified" trigger`);

    // Insert data into the "pages" table
    const insertedPages = await Promise.all(
      pages.map(
        (page) => client.sql`
        INSERT INTO pages (id, value, userId, title)
        VALUES (${page.id}, ${page.value}, ${page.userId}, ${page.title})
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