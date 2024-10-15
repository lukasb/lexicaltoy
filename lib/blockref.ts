import { $nodesOfType } from "lexical";
import { ListItemNode } from "@lexical/list";

export interface WikilinkWithBlockId {
  pageName: string;
  blockId: string;
}

/*
  * A block reference is a string that looks like this:
  * "Some text ^some-block-id"
  */
export const BLOCK_ID_REGEX = /(\^[a-zA-Z0-9-]+)\s*$/;
export const BLOCK_REFERENCE_REGEX = /#(\^[a-zA-Z0-9-]+)$/;

export function getBlockIdFromMarkdown(markdown: string): string | null {
  const match = markdown.match(BLOCK_ID_REGEX);
  return match ? match[1] : null;
}

export function getBlockReferenceFromMarkdown(markdown: string): string | null {
  const match = markdown.match(BLOCK_REFERENCE_REGEX);
  return match ? match[1] : null;
}

export function stripBlockId(markdown: string): string {
  const result = markdown.replace(BLOCK_ID_REGEX, "");
  return result;
}

export function stripBlockReference(markdown: string): string {
  return markdown.replace(BLOCK_REFERENCE_REGEX, "");
}

export function $findNodeByBlockId(blockId: string): ListItemNode | null {
  for (const node of $nodesOfType(ListItemNode)) {
    if (getBlockIdFromMarkdown(node.getTextContent()) === blockId) {
      return node;
    }
  }
  return null;
}

export function validateBlockId(blockId: string): boolean {
  return BLOCK_ID_REGEX.test(blockId);
}