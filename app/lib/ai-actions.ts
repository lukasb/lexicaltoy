'use server';

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']
});

export async function getShortGPTChatResponse(prompt: string): Promise<string | null> {

  const modelName = "gpt-3.5-turbo";
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