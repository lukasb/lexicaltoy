import { z } from 'zod';

/*
const UserPromptSchema = z.object({ prompt: z.string() });
export type UserPrompt = z.infer<typeof UserPromptSchema>;
*/

export enum FormulaValueType {
  Text = 'text',
  NodeMarkdown = 'nodeMarkdown',
  NodeTypeOrTypes = 'nodeTypeOrTypes',
  Wikilink = 'wikilink',
  TextWithCitations = 'textWithCitations'
}

// Schema for the citation object
const ChatCitationSchema = z.object({
  type: z.literal('char_location'),
  cited_text: z.string(),
  document_index: z.number(),
  document_title: z.string(),
  start_char_index: z.number(),
  end_char_index: z.number(),
});

// Schema for the content items
const ChatContentItemSchema = z.union([
  z.object({
      type: z.literal('text'),
      text: z.string(),
  }),
  z.object({
      type: z.literal('text'),
      text: z.string(),
      citations: z.array(ChatCitationSchema),
  }),
]);

export type ChatContentItem = z.infer<typeof ChatContentItemSchema>;

// Schema for the entire JSON structure
export const ChatContentSchema = z.object({
  content: z.array(ChatContentItemSchema),
});

export type ChatContent = z.infer<typeof ChatContentSchema>;

export const BaseNodeMarkdownSchema = z.object({
  nodeMarkdown: z.string(),
  pageName: z.string(),
  lineNumberStart: z.number(),
  lineNumberEnd: z.number(),
});

export type BaseNodeMarkdown = z.infer<typeof BaseNodeMarkdownSchema>;

export const NodeElementMarkdownSchema: z.ZodType<NodeElementMarkdown> = z.lazy(() =>
  z.object({
    baseNode: BaseNodeMarkdownSchema,
    children: z.array(NodeElementMarkdownSchema),
  })
);

export type NodeElementMarkdown = {
  baseNode: BaseNodeMarkdown;
  children: NodeElementMarkdown[];
};

const FormulaOutputSchema = z.object({
  output: z.union([
    z.string(),
    z.array(NodeElementMarkdownSchema),
    ChatContentSchema,
  ]),
  type: z.nativeEnum(FormulaValueType),
  isNegated: z.boolean().optional()
});

export type FormulaOutput = z.infer<typeof FormulaOutputSchema>;
/*
const FormulaInputSchema = z.union([ FormulaDefinitionSchema, UserPromptSchema ]);
export type FormulaInput = z.infer<typeof FormulaInputSchema>;

const FormulaOutputSchema = z.union([ FormulaDefinitionSchema, FormulaStringOutputSchema ]);
export type FormulaOutput = z.infer<typeof FormulaOutputSchema>;
*/

export function createBaseNodeMarkdown(
  pageName: string,
  lineNumberStart: number,
  lineNumberEnd: number,
  nodeMarkdown: string
): BaseNodeMarkdown {
  return { pageName, lineNumberStart, lineNumberEnd, nodeMarkdown };
}

export function getNodeElementEndLine(node: NodeElementMarkdown): number {
  if (node.children.length === 0) {
    return node.baseNode.lineNumberEnd;
  }
  const lastChild = node.children[node.children.length - 1];
  return getNodeElementEndLine(lastChild);
}

export function getNodeElementFullMarkdown(node: NodeElementMarkdown, depth: number = 0): string {
  //const indent = '    '.repeat(depth);
  const indent = '';
  let markdown = indent + node.baseNode.nodeMarkdown;
  
  if (node.children.length > 0) {
    const childrenMarkdown = node.children
      .map(child => getNodeElementFullMarkdown(child, depth + 1))
      .join('\n');
    markdown += '\n' + childrenMarkdown;
  }
  
  return markdown;
}

export function updateDescendant(
  parent: NodeElementMarkdown,
  oldDescendant: BaseNodeMarkdown,
  newDescendantMarkdown: string
): NodeElementMarkdown {
  const updatedParent: NodeElementMarkdown = JSON.parse(JSON.stringify(parent));
  const oldLineCount = oldDescendant.lineNumberEnd - oldDescendant.lineNumberStart + 1;
  const newLineCount = newDescendantMarkdown.split('\n').length;
  const lineDifference = newLineCount - oldLineCount;
  
  function updateNode(node: NodeElementMarkdown): boolean {
    if (node.baseNode.lineNumberStart === oldDescendant.lineNumberStart) {
      node.baseNode.nodeMarkdown = newDescendantMarkdown;
      node.baseNode.lineNumberEnd = node.baseNode.lineNumberStart + newLineCount - 1;
      return true;
    }

    for (let i = 0; i < node.children.length; i++) {
      if (updateNode(node.children[i])) {
        // Update subsequent siblings
        for (let j = i + 1; j < node.children.length; j++) {
          node.children[j].baseNode.lineNumberStart += lineDifference;
          node.children[j].baseNode.lineNumberEnd += lineDifference;
        }
        return true;
      }
    }

    return false;
  }

  updateNode(updatedParent);

  return updatedParent;
}