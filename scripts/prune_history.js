const envfile = process.argv[2] || './.env.development.local';
require('dotenv').config({ path: envfile }); 
const { db } = require('@vercel/postgres');

async function main() {

  console.log("pruning page history using env file: ", envfile);
  
  const client = await db.connect();

  await prunePageHistory(client);
  
  await client.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});

async function prunePageHistory(client) {
  const now = new Date();
  
  // Keep all revisions from the last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  await client.query('BEGIN');

  try {
    // Delete excess revisions older than 30 days, keeping one per day
    await client.query(`
      DELETE FROM pages_history
      WHERE history_id NOT IN (
        SELECT DISTINCT ON (id, DATE_TRUNC('day', history_created_at))
          history_id
        FROM pages_history
        WHERE history_created_at < $1
        ORDER BY id, DATE_TRUNC('day', history_created_at), history_created_at DESC
      )
      AND history_created_at < $1
    `, [thirtyDaysAgo]);

    await client.query('COMMIT');
    console.log('Pages history pruned successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error pruning pages history:', error);
    throw error;
  }
}