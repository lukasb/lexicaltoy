import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { MODEL_NAME } from '@/lib/ai-config';
import { getSessionServer } from '@/lib/getAuth';

export const config = {
  maxDuration: 60,
};

type ApiResponse = {
  response?: string;
  error?: string;
}

// Boolean flag to switch between OpenAI and Claude
const USE_CLAUDE = true;

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

const shortChatResponseSystemPrompt = `You will be given a user prompt. Give a concise response.`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Not Authorized' });
  }

  if (req.method === "POST") {
    const { prompt, dialogueContext } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    console.log("Received prompt:", prompt);
    console.log("Received context", dialogueContext);

    const openAIMessages: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: shortChatResponseSystemPrompt }];
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const element of dialogueContext) {
      openAIMessages.push({ role: 'user', content: element.userQuestion });
      openAIMessages.push({ role: 'assistant', content: element.systemAnswer });
      anthropicMessages.push({ role: 'user', content: element.userQuestion });
      anthropicMessages.push({ role: 'assistant', content: element.systemAnswer });
    }

    openAIMessages.push({ role: "user", content: prompt});
    anthropicMessages.push({ role: "user", content: prompt});

    console.log("OpenAI messages", openAIMessages);
    console.log("Anthropic messages", anthropicMessages);
    
    try {
      let response;

      if (USE_CLAUDE) {
        const message = await anthropic.messages.create({
          max_tokens: 1024,
          messages: anthropicMessages,
          model: 'claude-3-5-sonnet-20240620',
          system: shortChatResponseSystemPrompt,
        });

        response = message.content[0].type === 'text' 
          ? message.content[0].text 
          : 'Non-text response received';
      } else {
        const chatCompletion = await openai.chat.completions.create({
          messages: openAIMessages,
          model: MODEL_NAME,
        });

        response = chatCompletion.choices[0].message.content;
      }

      console.log("Chat Completion:", response);
      res.status(200).json({ response: response || undefined });
    } catch (error) {
      console.error("Error processing chat completion:", error);
      res.status(500).json({ error: "Failed to process the prompt" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}