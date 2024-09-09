import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { $getListItemContainingChildren } from '../list-utils';
import { $getListContainingChildren } from '@/lib/list-utils';
import { ListItemNode, $isListItemNode, $isListNode, ListNode } from '@lexical/list';
import { RootNode, ElementNode } from 'lexical';

function listContainsLIWithKey(list: ListNode, LIKey: string): boolean {
  const listItems = list.getChildrenSize();
  for (let i = 0; i < listItems; i++) {
    const listItem = list.getChildAtIndex(i);
    if ($isListItemNode(listItem) && listItemContainsLIWithKey(listItem, LIKey)) return true;
  }
  return false;
}

function listItemContainsLIWithKey(listItem: ListItemNode, LIKey: string): boolean {
  if (listItem.__key === LIKey) return true;
  const listContainingChildren = $getListContainingChildren(listItem);
  if (!listContainingChildren) return false;

  let child = listContainingChildren.getFirstChild();
  while (child && $isListItemNode(child)) {
    if (listItemContainsLIWithKey(child, LIKey)) return true;
    child = child.getNextSibling();
  }
  return false;
}

function getMarkdownUpToListItemFromListItem(listItemKey: string, include: boolean, listItem: ListItemNode): string {
  let fullMarkdown = "";
  if (listItem.__key === listItemKey) {
    if (include) {
      fullMarkdown += $convertToMarkdownString(TRANSFORMERS, {
        getChildren: () => [listItem],
      } as unknown as ElementNode);
    }
    return fullMarkdown;
  }
  const listContainingChildren = $getListContainingChildren(listItem);
  if (!listContainingChildren) return fullMarkdown;
  return getMarkdownUpToListItemFromList(listItemKey, include, listContainingChildren);
}

function getMarkdownUpToListItemFromList(listItemKey: string, include: boolean, list: ListNode): string {
  let fullMarkdown = "";
  const childrenSize = list.getChildrenSize();
  for (let i = 0; i < childrenSize; i++) {
    const child = list.getChildAtIndex(i);
    if (!$isListItemNode(child)) continue;
    if (!listItemContainsLIWithKey(child, listItemKey)) {
      fullMarkdown += $convertToMarkdownString(TRANSFORMERS, {
        getChildren: () => [child],
      } as unknown as ElementNode);
    } else {
      fullMarkdown += getMarkdownUpToListItemFromListItem(listItemKey, include, child);
    }
  }
  return fullMarkdown;
}

export function getMarkdownUpTo(listItemKey: string, include: boolean, root: RootNode): string {
  let fullMarkdown = "";
  const topLevelNodes = root.getChildrenSize();
  for (let i = 0; i < topLevelNodes; i++) {
    const node = root.getChildAtIndex(i);
    if (node) {
      if (!$isListNode(node)) {
        fullMarkdown += $convertToMarkdownString(TRANSFORMERS, {
          getChildren: () => [node],
        } as unknown as ElementNode);
      } else {
        if (!listContainsLIWithKey(node, listItemKey)) {
          fullMarkdown += $convertToMarkdownString(TRANSFORMERS, {
            getChildren: () => [node],
          } as unknown as ElementNode);
        } else {
          fullMarkdown += getMarkdownUpToListItemFromList(listItemKey, include, node);
          break;
        }
      }
    }
  }
  return fullMarkdown;
}