const fs = require('fs').promises;
const path = require('path');
const { seedUsers, seedPages } = require('../scripts/seed-inserts.js');

let envfile;
if (process.env.NODE_ENV === 'production') {
  envfile = '../.env.production.local';
} else if (process.env.NODE_ENV === 'development') {
  envfile = '../.env.development.local';
}
require('dotenv').config({ path: envfile }); 
const { db } = require('@/lib/dbwrapper');

async function importTextFiles(client, directoryPath, userId) {
  try {
    const files = await fs.readdir(directoryPath);

    for (const file of files) {
      if (path.extname(file).toLowerCase() === '.txt') {
        const filePath = path.join(directoryPath, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        let title = path.basename(file, '.txt');

        // Check if a page with the same title exists
        const existingPage = await client.sql`
          SELECT id FROM pages WHERE userId = ${userId} AND title = ${title}
        `;

        if (existingPage.rows.length > 0) {
          title += ' NV import';
        }

        // Insert the new page
        await client.sql`
          INSERT INTO pages (value, userId, title, last_modified)
          VALUES (${content}, ${userId}, ${title}, ${stats.mtime.toISOString()})
        `;

        console.log(`Imported: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error importing files:', error);
  }
}

async function main() {
  const client = await db.connect();

  try {
    // File import logic
    const directoryPath = '/Users/lukas/Library/CloudStorage/Dropbox/Apps/Notes for Android/';
    const userId = 'e20178a4-40df-4a18-8944-03cebc921e13';
    await importTextFiles(client, directoryPath, userId);

  } catch (error) {
    console.error('An error occurred during the database operations:', error);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});