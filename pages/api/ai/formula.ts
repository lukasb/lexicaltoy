import type { NextApiRequest, NextApiResponse } from 'next';
import {
  FormulaDefinition,
  getPromptDefiner
} from '@/lib/formula/formula-definitions';
import { toTool, parseArguments } from 'openai-zod-functions';
import OpenAI from 'openai';
import { MODEL_NAME } from '@/lib/ai-config';
import { getSessionServer } from '@/lib/getAuth';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

export const config = {
  maxDuration: 60,
};

const formulaDefinitionSystemPrompt = `You will be given a user prompt. Your task is to define a prompt template that matches the user's intent.`;

type ApiResponse = {
  formulaDefinition?: FormulaDefinition;
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
    let { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }
    if (prompt[0] === '=') {
      prompt = prompt.slice(1);
    }

    try {
      const promptDefiner = getPromptDefiner(prompt);
      const toolList = [toTool(promptDefiner)];
      console.log("toolList", toolList);

      const completion = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: formulaDefinitionSystemPrompt },
          { role: "user", content: prompt }
        ],
        tools: toolList,
      });

      const { message } = completion.choices[0];
      if (message.tool_calls) {
        const func = message.tool_calls[0].function;
        if (func.name === promptDefiner.name) {
          const formulaDefinition = parseArguments(
            func.name,
            func.arguments,
            promptDefiner.schema
          );
          console.log("formulaDefinition", formulaDefinition);
          return res.status(200).json({ formulaDefinition });
        } else {
          console.log("func name doesn't match promptDefiner name", func.name, promptDefiner.name);
        }
      } else {
        console.log("no tool calls", message);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process the prompt' });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}