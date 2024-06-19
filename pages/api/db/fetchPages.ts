import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from "@vercel/postgres";
import { Page } from '@/lib/definitions';
import { PageStatus } from '@/lib/definitions';
import { getSessionServer } from '@/lib/getAuth';
import { fetchPages } from '@/lib/dbFetch';

type ApiResponse = {
  pages?: Page[];
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
    const { userId, fetchDeleted } = req.body;
    
    // Validate the incoming data
    if (!userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const pages = await fetchPages(userId, fetchDeleted);
      return res.status(200).json({ pages });
    } catch (error) {
      console.error('Database Error: Failed to Fetch Pages.', error);
      res.status(500).json({ error: 'Database Error: Failed to Fetch Pages' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}