import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';
import { getSessionServer } from '@/lib/getAuth';
import { instructionsWithContext } from '@/lib/ai/ai-context';

export const config = {
  maxDuration: 60,
};

export type ApiResponse = {
  response?: string;
  error?: string;
}

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Not Authorized' });
  }

  if (req.method === "POST") {
    const { dialogueContext } = req.body;
    if (!dialogueContext || !dialogueContext.length) {
      return res.status(400).json({ error: "No dialogue context provided" });
    }
    
    console.log("Received context", dialogueContext);

    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const element of dialogueContext) {
      anthropicMessages.push({ role: element.role, content: element.content });
    }
    
    try {
      let response;

      const message = await anthropic.messages.create({
        max_tokens: 1024,
        messages: anthropicMessages,
        model: 'claude-3-5-sonnet-latest',
        system: instructionsWithContext,
        });

        response = message.content[0].type === 'text' 
          ? message.content[0].text 
          : 'Non-text response received';

      console.log("Chat Completion:", response);
      res.status(200).json({ response: response || undefined });
    } catch (error) {
      console.log("🛑 Error processing chat completion:", error);
      res.status(500).json({ error: "Failed to process the prompt" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}