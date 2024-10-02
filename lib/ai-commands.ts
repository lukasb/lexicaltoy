import { LexicalCommand, createCommand } from "lexical";
import { z } from "zod";

export const AI_GENERATE_NODES: LexicalCommand <void> = createCommand('AI_GENERATE_NODES');

export const AIGenListItem: z.ZodType<{
  content: string;
  children?: Array<{ content: string; children?: any }>;
}> = z.object({
  content: z.string().describe("The content of the list item"),
  children: z.lazy(() => z.array(AIGenListItem).describe("Child items, or null if no children"))
});

export type AIGenListItemType = z.infer<typeof AIGenListItem>;

export const AIGenListItems = z.object({
  listItems: z.array(AIGenListItem).describe("An array of list items, potentially with nested children")
});