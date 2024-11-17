import type { NextApiRequest, NextApiResponse } from 'next';
import { Page } from '@/lib/definitions';
import { getSessionServer } from '@/lib/getAuth';
import { fetchUpdatesSince } from '@/lib/dbFetch';

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
    const { userId, since } = req.body;
    
    // Validate the incoming data
    if (!userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const pages = await fetchUpdatesSince(userId, since);
      return res.status(200).json({ pages });
    } catch (error) {
      console.error('Database Error: Failed to Fetch Updates.', error);
      res.status(500).json({ error: 'Database Error: Failed to Fetch Updates' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}