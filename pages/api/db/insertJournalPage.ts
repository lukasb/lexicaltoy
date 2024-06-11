// pages/api/db/insertJournalPage.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@vercel/postgres";
import { Page, PageStatus } from "@/app/lib/definitions";

type ApiResponse = {
  page?: Page;
  error?: string;
}

interface DatabaseError {
  code?: string;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === 'POST') {
    const { title, value, userId, journalDate } = req.body;

    // Validate the incoming data
    if (!title || !value || !userId || !journalDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const result = await sql`
        INSERT INTO pages (title, value, userId, is_journal)
        VALUES (${title}, ${value}, ${userId}, true)
        RETURNING id, title, value, userId, last_modified, revision_number, is_journal, deleted
      `;

      const page: Page = {
        id: result.rows[0].id,
        title: result.rows[0].title,
        value: result.rows[0].value,
        userId: result.rows[0].userId,
        lastModified: new Date(result.rows[0].last_modified),
        revisionNumber: result.rows[0].revision_number,
        isJournal: result.rows[0].is_journal,
        deleted: result.rows[0].deleted,
        status: PageStatus.Quiescent
      };
      return res.status(200).json({ page });
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === '23505') {
        return res.status(409).json({ error: 'Journal Page already exists' });
      } else {
        console.error("Database Error: Failed to Insert Journal Page.", dbError);
        return res.status(500).json({ error: dbError.message || 'Database Error: Failed to Insert Journal Page' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}