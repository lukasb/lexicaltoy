import { ListItemNode, ListNode, $isListItemNode, $isListNode } from '@lexical/list';
import { RootNode,ElementNode, $isElementNode } from 'lexical';
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";

class LexicalListUtils {
  static getListContainingChildren(listItem: ListItemNode): ListNode | null {
    const nextSibling = listItem.getNextSibling();
    return $isListNode(nextSibling) ? nextSibling : null;
  }

  static traverseListItemsDepthFirst(
    node: ListNode | ListItemNode,
    callback: (node: ListNode | ListItemNode, depth: number) => boolean,
    depth: number = 0
  ): boolean {
    if ($isListItemNode(node)) {
      const firstChild = node.getFirstChild();
      if ($isListNode(firstChild)) {
        if (this.traverseListItemsDepthFirst(firstChild, callback, depth)) {
          return true;
        }
      } else {
        if (callback(node, depth)) {
          return true;
        }
      }
    }
    if ($isListNode(node)) {
      for (const child of node.getChildren()) {
        if ($isListItemNode(child)) {
          if (this.traverseListItemsDepthFirst(child, callback, depth + 1)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  static getMarkdownForNode(node: ElementNode): string {
    return $convertToMarkdownString(TRANSFORMERS, {
      getChildren: () => [node],
    } as unknown as ElementNode);
  }

  static getMarkdownUpTo(root: ListNode | ListItemNode, targetKey: string): string {
    let markdown = "";
    let found = false;

    this.traverseListItemsDepthFirst(root, (node, depth) => {
      if ($isListItemNode(node)) {
        if (node.__key === targetKey) {
          found = true;
          return true; // Stop traversal
        } else {
          markdown += "  ".repeat(depth - 1) + "- " + this.getMarkdownForNode(node) + "\n";
        }
      }
      return false; // Continue traversal
    });

    return markdown;
  }
}

export function getMarkdownUpTo(listItemKey: string, root: RootNode): string {
  let fullMarkdown = "";
  root.getChildren().forEach(node => {
    if ($isListNode(node)) {
      fullMarkdown += LexicalListUtils.getMarkdownUpTo(node, listItemKey);
    } else if ($isElementNode(node)) {
      fullMarkdown += LexicalListUtils.getMarkdownForNode(node) + "\n";
    }
  });

  return fullMarkdown;
}