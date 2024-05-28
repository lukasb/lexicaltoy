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

const modelName = "gpt-4o";

const shortGPTChatResponseSystemPrompt = `You will be given a user prompt. Your response should be one or two sentences.`;

export async function getShortGPTChatResponse(prompt: string): Promise<string | null> {

  console.log("getShortGPTChatResponse", prompt);
  const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: shortGPTChatResponseSystemPrompt },
        { role: 'user', content: prompt }
      ],
      model: modelName,
    });
  
  console.log("chatCompletion", chatCompletion.choices[0].message.content);
  return chatCompletion.choices[0].message.content;

}

const formulaDefinitionSystemPrompt = `You will be given a user prompt. Your task is to define a prompt template that will matches the user's intent.`;

export async function getFormulaDefinition(
  prompt: string
): Promise<FormulaDefinition | null> {
  if (prompt[0] === '=') prompt = prompt.slice(1);
  try {
    const promptDefiner = getPromptDefiner(prompt);
    const toolList = [toTool(promptDefiner)];
    console.log("toolList", toolList);
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: formulaDefinitionSystemPrompt},
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
        return formulaDefinition;
      } else {
        console.log("func name doesn't match promptDefiner name", func.name, promptDefiner.name);
      }
    } else {
      console.log("no tool calls", message);
    }
  } catch (e) {
    console.error(e);
  }

  return null;
}