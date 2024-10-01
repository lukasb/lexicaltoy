import { LexicalCommand, createCommand } from "lexical";
import { z } from "zod";

export const AI_GENERATE_NODES: LexicalCommand <void> = createCommand('AI_GENERATE_NODES');

export const ListItems = z.object({
  listItems: z.array(z.string().describe("A list item"))
});