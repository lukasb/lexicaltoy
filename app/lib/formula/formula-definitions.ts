import { z } from 'zod';
import { ZodFunctionDef } from 'openai-zod-functions';
import { WIKILINK_REGEX } from '@/app/lib/text-utils';

// TODO add other input/output types
// this works for simple prompts and for prompts where we need to append page contents
// and it always returns a short string
// TODO add the stuff we need for openAI function calls (name, description etc)
const FormulaDefinitionSchemaWithPage = z.object({
  prompt: z.string()
    .describe("A prompt that describes what ChatGPT should do."),
  inputPage: z.string()
    .describe(`If the user asked a question about a page, give the name of the page here. Page names look like this: [[PageName]], or [[Berlin trip ideas]]. The contents of the page will be appended to the prompt.`),
});
export type FormulaDefinitionWithPage = z.infer<typeof FormulaDefinitionSchemaWithPage>;

export function isFormulaDefinitionWithPage(obj: any): obj is FormulaDefinitionWithPage {
  return obj && obj.inputPage;
}

const FormulaDefinitionSchemaWithoutPage = z.object({
  prompt: z.string()
    .describe("A prompt that describes what ChatGPT should do."),
});
export type FormulaDefinitionWithoutPage = z.infer<typeof FormulaDefinitionSchemaWithoutPage>;

export type FormulaDefinition = FormulaDefinitionWithPage | FormulaDefinitionWithoutPage;
/*
const UserPromptSchema = z.object({ prompt: z.string() });
export type UserPrompt = z.infer<typeof UserPromptSchema>;
*/

export enum FormulaOutputType {
  Text = 'text',
  NodeMarkdown = 'nodeMarkdown',
}

const NodeMarkdownSchema = z.object({
  node: z.string(),
  pageName: z.string(),
});

export type NodeMarkdown = z.infer<typeof NodeMarkdownSchema>;

const FormulaStringOutputSchema = z.object({
  output: z.union([
    z.string(),
    z.array(NodeMarkdownSchema),
  ]),
  type: z.nativeEnum(FormulaOutputType),
});

export type FormulaStringOutput = z.infer<typeof FormulaStringOutputSchema>;
/*
const FormulaInputSchema = z.union([ FormulaDefinitionSchema, UserPromptSchema ]);
export type FormulaInput = z.infer<typeof FormulaInputSchema>;

const FormulaOutputSchema = z.union([ FormulaDefinitionSchema, FormulaStringOutputSchema ]);
export type FormulaOutput = z.infer<typeof FormulaOutputSchema>;
*/
export function getPromptDefiner(prompt: string): ZodFunctionDef {
  if (WIKILINK_REGEX.exec(prompt) !== null) {
    return {
      name: 'define-prompt',
      description: 'Define a prompt template that matches the user intent.',
      schema: FormulaDefinitionSchemaWithPage
    };
  } else {
    return {
      name: 'define-prompt',
      description: 'Define a prompt template that matches the user intent.',
      schema: FormulaDefinitionSchemaWithoutPage
    };
  }
}