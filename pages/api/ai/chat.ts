import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { MODEL_NAME } from '@/lib/ai-config';
import { getSessionServer } from '@/lib/getAuth';

export const config = {
  maxDuration: 60,
};

type ApiResponse = {
  response?: string;
  error?: string;
}

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

const shortGPTChatResponseSystemPrompt = `You will be given a user prompt. Give a concise response.`;

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

    const messages: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: shortGPTChatResponseSystemPrompt }];

    for (const element of dialogueContext) {
      messages.push({ role: 'user', content: element.userQuestion });
      messages.push({ role: 'assistant', content: element.systemAnswer });
    }

    messages.push({ role: "user", content: prompt});

    console.log("messages", messages);
    
    try {

      const chatCompletion = await openai.chat.completions.create({
        messages: messages,
        model: MODEL_NAME,
      });

      console.log(
        "Chat Completion:",
        chatCompletion.choices[0].message.content
      );
      res
        .status(200)
        .json({ response: chatCompletion.choices[0].message.content ? chatCompletion.choices[0].message.content : undefined});
    } catch (error) {
      console.error("Error processing chat completion:", error);
      res.status(500).json({ error: "Failed to process the prompt" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}