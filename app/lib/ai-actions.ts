'use server';

import {
  FormulaDefinition,
  getPromptDefiner
} from './formula/formula-definitions';

import { toTool, parseArguments } from 'openai-zod-functions';

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

const modelName = "gpt-4";

export async function getShortGPTChatResponse(prompt: string): Promise<string | null> {

  console.log("getShortGPTChatResponse", prompt);
  const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'user', content: prompt }
      ],
      model: modelName,
    });
  
  console.log("chatCompletion", chatCompletion.choices[0].message.content);
  return chatCompletion.choices[0].message.content;

}

export async function getFormulaDefinition(
  prompt: string
): Promise<FormulaDefinition | null> {
  console.log('getting formula definition', prompt);
  try {
    const promptDefiner = getPromptDefiner(prompt);
    const toolList = [toTool(promptDefiner)];
    console.log("toolList", toolList);
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
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
        return formulaDefinition;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return null;
}