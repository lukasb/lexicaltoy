'use server';

import {
  FormulaDefinition,
  promptDefiner
} from './formula/formula-definitions';

import { toTool, parseArguments } from 'openai-zod-functions';

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

const modelName = "gpt-3.5-turbo";

export async function getShortGPTChatResponse(prompt: string): Promise<string | null> {

  const system_propt = "Answer the user question. Your response should be a single sentence.";
  const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: system_propt },
        { role: 'user', content: prompt }
      ],
      model: modelName,
    });
  
  return chatCompletion.choices[0].message.content;

}

export async function getFormulaDefinition(
  prompt: string
): Promise<FormulaDefinition | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      tools: [toTool(promptDefiner)],
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
        return formulaDefinition;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return null;
}