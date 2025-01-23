import OpenAI from "openai";
import { zodFunction, zodResponseFormat } from "openai/helpers/zod";
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionServer } from '@/lib/getAuth';
import { MODEL_NAME } from "@/lib/ai-config";
import { AIGenListItems } from "@/lib/ai-commands";

export const config = {
  maxDuration: 60,
};

type ApiResponse = {
  response?: string;
  error?: string;
}

const tools = [
  zodFunction({ name: "createList", parameters: AIGenListItems })
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateSystemPrompt = `The user is asking you to generate one or more list items. Depending on the user's prompt, these might be plain text, or they might be to-do list items.
To generate to-do list items, begin a list item with one of the following: TODO, NOW, WAITING, LATER. Example to-do: 'TODO fix drain'`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const session = await getSessionServer(req, res);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Not Authorized' });
  }

  if (req.method === "POST") {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    console.log("Received prompt:", prompt);

    const openAIMessages: OpenAI.ChatCompletionMessageParam[] = [];

    openAIMessages.push({ role: "system", content: generateSystemPrompt });
    openAIMessages.push({ role: "user", content: prompt});
    
    try {
      let response: string | undefined;

      const chatCompletion = await openai.beta.chat.completions.parse({
        messages: openAIMessages,
        model: MODEL_NAME,
        response_format: zodResponseFormat(AIGenListItems, "listItems"),
      });

      response = chatCompletion.choices[0].message.content || undefined;
      console.log("GPT Generation:", response);
      res.status(200).json({ response: response || undefined });
    } catch (error) {
      console.log("🛑 Error processing GPT generation:", error);
      res.status(500).json({ error: "Failed to process the prompt" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}