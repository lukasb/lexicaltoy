import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@vercel/postgres";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ deletedIds: string[], error?: string }>
) {
  if (req.method === 'POST') {
    const { ids, defaultValue } = req.body;

    // Validate the incoming data
    if (!ids || !defaultValue || !Array.isArray(ids)) {
      return res.status(400).json({ deletedIds: [], error: 'Invalid input data' });
    }

    const deletedIds: string[] = [];

    for (const id of ids) {
      try {
        const result = await sql`
          SELECT id
          FROM pages
          WHERE id = ${id}
        `;

        if (result.rows.length === 0) {
          deletedIds.push(id);
        } else {
          const deleteResult = await sql`
            UPDATE pages
            SET deleted = true, revision_number = revision_number + 1
            WHERE id = ${id} AND value = ${defaultValue}
            RETURNING id
          `;
          if (deleteResult.rows.length > 0) {
            deletedIds.push(deleteResult.rows[0].id);
          }
        }
      } catch (error) {
        console.log(`Database Error: Failed to Delete Page with ID ${id}:`, error);
        continue; // Optionally handle the error more explicitly
      }
    }

    return res.status(200).json({ deletedIds });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}