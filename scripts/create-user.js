const bcrypt = require("bcrypt");

const userName = "Alice";
const userEmail = "alice@nextmail.com";
const userPassword = "123456";

const defaultPageValue = "- ";
const defaultPageTitle = "My First Page";

const nodeEnv = process.env.NODE_ENV || 'development';

let envfile;
if (nodeEnv === 'production') {
  console.log('production db');
  envfile = './.env.production.local';
} else if (nodeEnv === 'development') {
  console.log('development db');
  envfile = './.env.development.local';
} else {
  console.log("NODE_ENV not set");
  process.exit(1);
}
require('dotenv').config({ path: envfile }); 
const { db } = require('@vercel/postgres');

async function main() {
  const client = await db.connect();

  newUserId = await addUser(userName, userEmail, userPassword, client);
  await addPage(newUserId, defaultPageValue, defaultPageTitle, client);
  
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