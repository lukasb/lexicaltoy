const bcrypt = require("bcryptjs");

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
      })
    );

    console.log(`Seeded ${insertedUsers.length} users`);

    return {
      createTable,
      users: insertedUsers,
    };
  } catch (error) {
    console.error("Error seeding users:", error);
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
      last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      revision_number INT NOT NULL DEFAULT 1,
      is_journal BOOLEAN NOT NULL DEFAULT FALSE,
      deleted BOOLEAN NOT NULL DEFAULT FALSE
    );
`;

    console.log(`Created "pages" table`);

    const createRevisionNumberConstraintFunction = await client.sql`
      CREATE OR REPLACE FUNCTION validate_revision_update() 
      RETURNS TRIGGER AS $$
      BEGIN
      -- Require revision number to be exactly one greater than current value
      IF NEW.revision_number != (OLD.revision_number + 1) THEN
        RAISE EXCEPTION 'Revision number must be exactly one greater than current revision'; 
      END IF;

      RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    console.log(`Created "validate_revision_update" function`);

    const createRevisionNumberConstraintTrigger = await client.sql`
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'revision_validation_trigger'
        ) THEN
            -- do nothing
        ELSE
            EXECUTE 'CREATE TRIGGER revision_validation_trigger BEFORE UPDATE ON pages FOR EACH ROW EXECUTE PROCEDURE validate_revision_update();';
        END IF;
    END
    $$;
    `;

    console.log(`Created "validate_revision_update" trigger`);

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

    const createLastModifiedTrigger = await client.sql`
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'update_pages_last_modified'
        ) THEN
            -- do nothing
        ELSE
            EXECUTE 'CREATE TRIGGER update_pages_last_modified BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_last_modified_column();';
        END IF;
    END
    $$;
    `;

    console.log(`Created "update_pages_last_modified" trigger`);
    
    const createUniqueJournalTrigger = await client.sql`
    DO $$
    BEGIN
        -- Replace 'unique_pages' with your constraint name
        -- Replace 'pages' with your table name
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'unique_pages'
        ) THEN
            ALTER TABLE pages
            ADD CONSTRAINT unique_pages UNIQUE (userId, title);
        END IF;
    END$$;
    `;

    console.log(`Created "unique_pages" constraint`);
    
    // Create the backup table if it doesn't exist
    const createBackupTable = await client.sql`
     CREATE TABLE IF NOT EXISTS pages_history (
      history_id SERIAL PRIMARY KEY,
      id UUID NOT NULL,
      value TEXT NOT NULL,
      userid UUID NOT NULL,
      title TEXT NOT NULL,
      last_modified TIMESTAMP WITH TIME ZONE NOT NULL,
      history_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      revision_number INT NOT NULL DEFAULT 1,
      is_journal BOOLEAN NOT NULL DEFAULT FALSE,
      deleted BOOLEAN NOT NULL DEFAULT FALSE
    );
    `;

    console.log(`Created "pages_history" table`);

    // Insert data into the "pages" table
    const insertedPages = await Promise.all(
      pages.map(
        (page) => client.sql`
        INSERT INTO pages (id, value, userId, title)
        VALUES (${page.id}, ${page.value}, ${page.userId}, ${page.title})
        ON CONFLICT (id) DO NOTHING;
      `
      )
    );

    console.log(`Seeded ${insertedPages.length} user outlines`);

    return {
      createTable,
      pages: insertedPages,
    };
  } catch (error) {
    console.error("Error seeding pages:", error);
    throw error;
  }
}
