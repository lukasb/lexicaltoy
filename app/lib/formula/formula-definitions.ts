import { z } from 'zod';
import { ZodFunctionDef } from 'openai-zod-functions';

// TODO add other input/output types
// this works for simple prompts and for prompts where we need to append page contents
// and it always returns a short string
// TODO add the stuff we need for openAI function calls (name, description etc)
const FormulaDefinitionSchema = z.object({
  prompt: z.string()
    .describe("A prompt that describes what ChatGPT should do."),
  outputCaption: z.string()
    .describe("Short caption to be displayed to the user to explain what the prompt output is."),
  inputPage: z.string().optional()
    .describe(`If the function takes a page as input, such as [[PageName]], give the name of the 
              page here. The contents of the page will be appended to the prompt.`),
});
export type FormulaDefinition = z.infer<typeof FormulaDefinitionSchema>;

/*
const UserPromptSchema = z.object({ prompt: z.string() });
export type UserPrompt = z.infer<typeof UserPromptSchema>;
*/
const FormulaStringOutputSchema = z.object({ 
  output: z.string(),
  caption: z.string()
});
export type FormulaStringOutput = z.infer<typeof FormulaStringOutputSchema>;
/*
const FormulaInputSchema = z.union([ FormulaDefinitionSchema, UserPromptSchema ]);
export type FormulaInput = z.infer<typeof FormulaInputSchema>;

const FormulaOutputSchema = z.union([ FormulaDefinitionSchema, FormulaStringOutputSchema ]);
export type FormulaOutput = z.infer<typeof FormulaOutputSchema>;
*/
export const promptDefiner: ZodFunctionDef = {
  name: 'define-prompt',
  description: 'Define a prompt template that matches the user intent.',
  schema: FormulaDefinitionSchema,
};