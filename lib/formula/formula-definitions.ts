import { z } from 'zod';

/*
const UserPromptSchema = z.object({ prompt: z.string() });
export type UserPrompt = z.infer<typeof UserPromptSchema>;
*/

export enum FormulaOutputType {
  Text = 'text',
  NodeMarkdown = 'nodeMarkdown',
}

export const NodeMarkdownSchema = z.object({
  nodeMarkdown: z.string(),
  pageName: z.string(),
  lineNumberStart: z.number(),
  lineNumberEnd: z.number(),
});

export type NodeMarkdown = z.infer<typeof NodeMarkdownSchema>;

const FormulaOutputSchema = z.object({
  output: z.union([
    z.string(),
    z.array(NodeMarkdownSchema),
  ]),
  type: z.nativeEnum(FormulaOutputType)
});

export type FormulaOutput = z.infer<typeof FormulaOutputSchema>;
/*
const FormulaInputSchema = z.union([ FormulaDefinitionSchema, UserPromptSchema ]);
export type FormulaInput = z.infer<typeof FormulaInputSchema>;

const FormulaOutputSchema = z.union([ FormulaDefinitionSchema, FormulaStringOutputSchema ]);
export type FormulaOutput = z.infer<typeof FormulaOutputSchema>;
*/

export function createNodeMarkdown(
  pageName: string,
  lineNumberStart: number,
  lineNumberEnd: number,
  nodeMarkdown: string
): NodeMarkdown {
  return { pageName, lineNumberStart, lineNumberEnd, nodeMarkdown };
}