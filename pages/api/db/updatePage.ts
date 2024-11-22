// pages/api/updatePage.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@/lib/dbwrapper";
import { getSessionServer } from '@/lib/getAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{revisionNumber?: number, lastModified?: Date, error?: string}>
) {

  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Not Authorized' });
  }

  const { id, value, title, deleted, oldRevisionNumber, lastModified } = req.body;

  if (req.method === 'POST') {

    if (!id || value === undefined || oldRevisionNumber === undefined || 
      title === undefined || deleted === undefined || lastModified === undefined
    ) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      // Insert the current page data into the history table directly from the pages table
      await sql`
        INSERT INTO pages_history (id, title, value, deleted, userid, last_modified, revision_number)
        SELECT id, title, value, deleted, userid, last_modified, revision_number
        FROM pages
        WHERE id = ${id}
      `;

      // Then, update the page with the new value, but only if the revision number matches
      const result = await sql`
        UPDATE pages
        SET value = ${value}, 
            title = ${title}, 
            deleted = ${deleted}, 
            revision_number = ${oldRevisionNumber + 1},
            last_modified = ${lastModified}
        WHERE id = ${id} 
        AND revision_number = ${oldRevisionNumber}
        RETURNING revision_number, last_modified
      `;
      
      if (result.rowCount === 0) {
        // Check if the page exists at all
        const pageExists =
          await sql`SELECT revision_number FROM pages WHERE id = ${id}`;
        if (pageExists.rowCount === 0) {
          return res
            .status(404)
            .json({ error: `Page with ID ${id} not found` });
        }
        // If we get here, the page exists but revision number didn't match
        return res.status(409).json({
          error: `Conflict: Page has been modified by another user, ID: ${id}, tried revision number: ${oldRevisionNumber}`,
        });
      }
      
      return res.status(200).json({ revisionNumber: result.rows[0].revision_number, lastModified: result.rows[0].last_modified });
    } catch (error) {
      console.error(`Database Error: failed to Update Page - ID: ${id}, RevisionNumber: ${oldRevisionNumber}`, error);
      res.status(500).json({ error: 'Database Error: Failed to Update Page' + oldRevisionNumber });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}