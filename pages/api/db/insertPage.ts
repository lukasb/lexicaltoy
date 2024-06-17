"use server";

import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@vercel/postgres";
import { Page } from '@/lib/definitions';
import { PageStatus } from '@/lib/definitions';
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
    const { title, value, userId } = req.body;
    
    // Validate the incoming data
    if (!title || !value || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const result = await sql`
        INSERT INTO pages (title, value, userId)
        VALUES (${title}, ${value}, ${userId})
        RETURNING id, title, value, userId, last_modified, revision_number, is_journal, deleted
      `;
      const page: Page = {
        id: result.rows[0].id,
        title: result.rows[0].title,
        value: result.rows[0].value,
        userId: String(result.rows[0].userId),
        lastModified: new Date(result.rows[0].last_modified),
        revisionNumber: result.rows[0].revision_number,
        isJournal: result.rows[0].is_journal,
        deleted: result.rows[0].deleted,
        status: PageStatus.Quiescent
      };
      return res.status(200).json({ page });
    } catch (error) {
      console.error('Database Error: Failed to Insert Page.', error);
      res.status(500).json({ error: 'Database Error: Failed to Insert Page' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}