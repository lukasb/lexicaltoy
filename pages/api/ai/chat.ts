import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { MODEL_NAME } from '@/app/lib/ai-config';

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
  if (req.method === "POST") {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    console.log("Received prompt:", prompt);

    try {

      const chatCompletion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: shortGPTChatResponseSystemPrompt },
          { role: "user", content: prompt },
        ],
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