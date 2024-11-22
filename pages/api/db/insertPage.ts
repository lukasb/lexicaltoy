import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@/lib/dbwrapper";
import { isPage, Page } from '@/lib/definitions';
import { getSessionServer } from '@/lib/getAuth';

type ApiResponse = {
  page?: Page;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {

  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Not Authorized' });
  }

  if (req.method === 'POST') {
    const { title, value, userId, id, lastModified, isJournal } = req.body;
    
    // Validate the incoming data
    if (!title || !value || !userId || !lastModified || isJournal === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log("---inserting page---", title, id, userId);

    try {
      let result;
      if (id) {
        result = await sql`
          INSERT INTO pages (id, title, value, userid, is_journal, last_modified)
          VALUES (${id}, ${title}, ${value}, ${userId}, ${isJournal}, ${lastModified})
          RETURNING id, title, value, userid, last_modified, revision_number, is_journal, deleted
        `;
      } else {
        result = await sql`
          INSERT INTO pages (title, value, userid, is_journal, last_modified)
          VALUES (${title}, ${value}, ${userId}, ${isJournal}, ${lastModified})
          RETURNING id, title, value, userid, last_modified, revision_number, is_journal, deleted
        `;
      }
      const page: Page = {
        id: result.rows[0].id,
        title: result.rows[0].title,
        value: result.rows[0].value,
        userId: result.rows[0].userid,
        lastModified: new Date(result.rows[0].last_modified),
        revisionNumber: result.rows[0].revision_number,
        isJournal: result.rows[0].is_journal,
        deleted: result.rows[0].deleted
      };
      if (!isPage(page)) throw new Error("expected page, got", page);
      console.log("inserted page", page.title, page.id, userId);
      return res.status(200).json({ page });
    } catch (error) {
      console.error('Database Error: Failed to Insert Page.', error);
      // Check for duplicate key error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isDuplicateKey = errorMessage.includes('duplicate key value');
      
      res.status(isDuplicateKey ? 409 : 500).json({ 
        error: isDuplicateKey 
          ? 'Duplicate key error' 
          : 'Database Error: Failed to Insert Page'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}