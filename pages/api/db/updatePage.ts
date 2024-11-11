// pages/api/updatePage.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@vercel/postgres";
import { getSessionServer } from '@/lib/getAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{revisionNumber?: number, lastModified?: Date, error?: string}>
) {

  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Not Authorized' });
  }

  if (req.method === 'POST') {
    const { id, value, title, deleted, oldRevisionNumber } = req.body;

    if (!id || value === undefined || oldRevisionNumber === undefined || 
      title === undefined || deleted === undefined
    ) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      // Insert the current page data into the history table directly from the pages table
      await sql`
        INSERT INTO pages_history (id, title, value, deleted, userId, last_modified, revision_number)
        SELECT id, title, value, deleted, userId, last_modified, revision_number
        FROM pages
        WHERE id = ${id}
      `;

      // Then, update the page with the new value
      const result = await sql`
        UPDATE pages
        SET value = ${value}, title = ${title}, deleted = ${deleted}, revision_number = ${oldRevisionNumber + 1}
        WHERE id = ${id}
        RETURNING revision_number, last_modified
      `;
      return res.status(200).json({ revisionNumber: result.rows[0].revision_number, lastModified: result.rows[0].last_modified });
    } catch (error) {
      console.error("Database Error: Failed to Update Page", error, id, oldRevisionNumber);
      res.status(500).json({ error: 'Database Error: Failed to Update Page' + oldRevisionNumber });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}