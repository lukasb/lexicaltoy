const bcrypt = require("bcryptjs");

const userName = "Jan";
const userEmail = "janeazy@gmail.com";
const userPassword = "123456";

const defaultPageValue = "- ";
const defaultPageTitle = "My First Page";

const nodeEnv = process.env.NODE_ENV || 'development';

let envfile;
let manualPageId;
if (nodeEnv === 'production') {
  console.log('production db');
  envfile = './.env.production.local';
  manualPageId = "a1106fd8-cb90-4bd6-8031-f4ede8ee0d24";
} else if (nodeEnv === 'development') {
  console.log('development db');
  envfile = './.env.development.local';
  manualPageId = "a1106fd8-cb90-4bd6-8031-f4ede8ee0d24"; // yes same as prod
} else {
  console.log("NODE_ENV not set");
  process.exit(1);
}
require('dotenv').config({ path: envfile }); 
const { db } = require('@/lib/dbwrapper');

async function main() {
  const client = await db.connect();

  newUserId = await addUser(userName, userEmail, userPassword, client);
  await addPage(newUserId, defaultPageValue, defaultPageTitle, client);
  await copyManualPage(newUserId, client);  // Add this line
  
  await client.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});

async function addUser(name, email, password, client) {
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await client.sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
      RETURNING id;
    `;

    if (result.rows && result.rows.length > 0) {
      console.log("Added new user with id", result.rows[0].id);
      const newUuid = result.rows[0].id;
      return newUuid;
    } else {
      console.log("No inserted users");
      return null;
    }
  } catch (error) {
    // Debug: Log the error if the query fails
    console.error("Error inserting user:", error);
    return null;
  }
}

async function addPage(userId, value, title, client) {
  try {
  const insertedPages = await client.sql`
      INSERT INTO pages (userId, value, title)
      VALUES (${userId}, ${value}, ${title})
      RETURNING id;
    `;

    if (insertedPages.rows && insertedPages.rows.length > 0) {
      console.log("Added new page with id", insertedPages.rows[0].id);
    } else {
      console.log("No inserted pages");
    }
  } catch (error) {
    console.error("Error inserting page:", error);
  }
}

async function copyManualPage(userId, client) {
  try {
    const manualPage = await client.sql`
      SELECT value, title FROM pages WHERE id = ${manualPageId};
    `;

    if (manualPage.rows && manualPage.rows.length > 0) {
      const { value, title } = manualPage.rows[0];
      const insertedPage = await client.sql`
        INSERT INTO pages (userId, value, title)
        VALUES (${userId}, ${value}, ${title})
        RETURNING id;
      `;

      if (insertedPage.rows && insertedPage.rows.length > 0) {
        console.log("Copied manual page with new id", insertedPage.rows[0].id);
      } else {
        console.log("Failed to copy manual page");
      }
    } else {
      console.log("Manual page not found");
    }
  } catch (error) {
    console.error("Error copying manual page:", error);
  }
}