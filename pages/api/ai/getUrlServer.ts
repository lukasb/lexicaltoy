import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionServer } from '@/lib/getAuth';
import axios from 'axios';
import TurndownService from 'turndown';
import * as cheerio from 'cheerio';

export const config = {
  maxDuration: 60,
};

type ApiResponse = {
  response?: { [key: string]: string };
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

  if (req.method === "POST") {
    const { urls = [] } = req.body as { urls?: string[] };
    if (!urls.length) {
      return res.status(400).json({ error: "No URLs provided" });
    }

    console.log("Received URLs:", urls);
    const markdownContent = new Map<string, string>();

    for (const url of urls) {
      try {
        // Fetch the web page content
        const response = await axios.get(url, {
          timeout: 10000, // 10 second timeout
        });
    
        const html = response.data;
    
        // Parse the HTML using cheerio
        const $ = cheerio.load(html);
    
        // Remove script and style tags
        $('script, style').remove();
    
        // Get the main content (you might need to adjust this selector)
        const mainContent = $('body').html() || '';
    
        // Convert HTML to Markdown
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(mainContent);
    
        markdownContent.set(url, markdown);
      } catch (error) {
        console.error('Error fetching or converting content:', error);
      }
    }
    
    if (markdownContent.size > 0) {
      const serializedContent = Object.fromEntries(markdownContent);
      res
        .status(200)
        .json({ response: serializedContent });
    } else {
      console.error("Error getting URLs");
      res.status(500).json({ error: "Error getting URLs" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}