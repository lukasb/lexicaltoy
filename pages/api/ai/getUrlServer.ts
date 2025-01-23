import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionServer } from '@/lib/getAuth';
import axios from 'axios';
import {convertHtmlToMarkdown} from 'dom-to-semantic-markdown';
import {JSDOM} from 'jsdom';

export const config = {
  maxDuration: 60,
};

type ApiResponse = {
  response?: { [key: string]: string };
  error?: string;
}

function setupDOMPolyfill() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

  // Polyfill global objects if they don't exist
  if (typeof global.window === "undefined") global.window = dom.window as any;
  if (typeof global.document === "undefined")
    global.document = dom.window.document;
  if (typeof global.Node === "undefined") global.Node = dom.window.Node;
  if (typeof global.Element === "undefined")
    global.Element = dom.window.Element;
  if (typeof global.HTMLElement === "undefined")
    global.HTMLElement = dom.window.HTMLElement;
  if (typeof global.DOMParser === "undefined")
    global.DOMParser = dom.window.DOMParser;
}

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.35",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.35",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.35",
  "Mozilla/5.0 (Windows NT 6.1; rv:109.0) Gecko/20100101 Firefox/113.0",
  "Mozilla/5.0 (Android 12; Mobile; rv:109.0) Gecko/113.0 Firefox/113.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/113.0",
];

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
        const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
        const urlWithProtocol = url.startsWith("http") ? url : "https://" + url;
        const response = await axios.get(urlWithProtocol, {
          timeout: 10000, 
          headers: {
            'User-Agent': ua
          }
        });
    
        const html = response.data;
    
        setupDOMPolyfill();

        // Convert HTML to Markdown
        const dom = new JSDOM(html);

        const markdown = convertHtmlToMarkdown(html, {overrideDOMParser: new dom.window.DOMParser()});
    
        markdownContent.set(url, markdown);
      } catch (error) {
        console.log('🛑 Error fetching or converting content:', error);
      }
    }
    
    if (markdownContent.size > 0) {
      const serializedContent = Object.fromEntries(markdownContent);
      res
        .status(200)
        .json({ response: serializedContent });
    } else {
      console.log("🛑 Error getting URLs");
      res.status(500).json({ error: "Error getting URLs" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}