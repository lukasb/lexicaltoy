// pages/api/updatePageTitle.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@vercel/postgres";
import { getSessionServer } from '@/lib/getAuth';

type ApiResponse = {
  revisionNumber?: number;
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
    const { id, title, oldRevisionNumber } = req.body;

    // Validate the input
    if (!id || !title || oldRevisionNumber === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const result = await sql`
        UPDATE pages
        SET title = ${title}, revision_number = ${oldRevisionNumber + 1}
        WHERE id = ${id}
        RETURNING revision_number
      `;
      const revisionNumber = result.rows[0].revision_number;
      return res.status(200).json({ revisionNumber });
    } catch (error) {
      console.error("Database Error: Failed to Update Page Title.", error);
      res.status(500).json({ error: 'Database Error: Failed to Update Page Title' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}