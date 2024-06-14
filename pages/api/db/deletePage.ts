"use server";

import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@vercel/postgres";
import { getSessionServer } from '@/app/lib/getAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ revisionNumber?: number, error?: string }>
) {

  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Not Authorized' });
  }

  if (req.method === 'POST') {
    const { id, oldRevisionNumber } = req.body;

    // Validate the incoming data
    if (!id || oldRevisionNumber === undefined) {
      return res.status(400).json({ error: 'Missing required parameters: id or oldRevisionNumber' });
    }

    try {
      const result = await sql`
        UPDATE pages
        SET deleted = true, revision_number = ${oldRevisionNumber + 1}
        WHERE id = ${id}
        RETURNING revision_number
      `;

      if (result.rows.length > 0) {
        return res.status(200).json({ revisionNumber: result.rows[0].revision_number });
      } else {
        return res.status(404).json({ error: 'Page not found or no update needed' });
      }
    } catch (error) {
      console.error("Database Error: Failed to Delete Page with ID " + id + ".", error);
      res.status(500).json({ error: 'Database Error: Failed to Delete Page' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}