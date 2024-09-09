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
  console.log("listItemContainsLIWithKey", listItem.__key, LIKey);
  if (listItem.__key === LIKey) {
    console.log("returning true");
    return true;
  }
  const listContainingChildren = $getListContainingChildren(listItem);
  if (!listContainingChildren) return false;

  let child = listContainingChildren.getFirstChild();
  while (child && $isListItemNode(child)) {
    if (listItemContainsLIWithKey(child, LIKey)) return true;
    child = child.getNextSibling();
  }
  return false;
}

function getListItemMarkdownWithChildren(listItem: ListItemNode, indent: string): string {
  let markdown = "";
  markdown += indent + '- ' +$convertToMarkdownString(TRANSFORMERS, {
    getChildren: () => [listItem],
  } as unknown as ElementNode) + "\n";
  const listContainingChildren = $getListContainingChildren(listItem);
  if (listContainingChildren) {
    const childrenSize = listContainingChildren.getChildrenSize();
    for (let i = 0; i < childrenSize; i++) {
      const child = listContainingChildren.getChildAtIndex(i);
      if ($isListItemNode(child)) {
        markdown += indent + '    ' + getListItemMarkdownWithChildren(child, indent + '    ');
      }
    }
  }
  return markdown;
}

function getMarkdownUpToListItemFromListItem(listItemKey: string, include: boolean, listItem: ListItemNode, indent: string): string {
  if (listItem.__key === listItemKey && !include) return "";

  let fullMarkdown = indent + '- ' + $convertToMarkdownString(TRANSFORMERS, {
    getChildren: () => [listItem],
  } as unknown as ElementNode) + "\n";

  const listContainingChildren = $getListContainingChildren(listItem);
  if (!listContainingChildren) return fullMarkdown;
  return fullMarkdown + getMarkdownUpToListItemFromList(listItemKey, include, listContainingChildren, indent + '    ');
}

function getMarkdownUpToListItemFromList(listItemKey: string, include: boolean, list: ListNode, indent: string): string {
  let fullMarkdown = "";
  const childrenSize = list.getChildrenSize();
  for (let i = 0; i < childrenSize; i++) {
    const child = list.getChildAtIndex(i);
    if (!$isListItemNode(child)) continue;
    if (!listItemContainsLIWithKey(child, listItemKey)) {
      console.log("doesn't contain it", child.getTextContent());
      fullMarkdown += getListItemMarkdownWithChildren(child, indent);
    } else {
      console.log("does contain it");
      fullMarkdown += getMarkdownUpToListItemFromListItem(listItemKey, include, child, indent);
      break;
    }
    if ($getListItemContainingChildren(child)){
      // in this case our next sibling just has our children
      // we've already processed our children, so we skip our next sibling
      i++;
    }
  }
  return fullMarkdown;
}

export function getMarkdownUpTo(listItemKey: string, include: boolean, root: RootNode): string {
  let fullMarkdown = "";
  console.log("getMarkdownUpTo", listItemKey, include);
  const topLevelNodes = root.getChildrenSize();
  for (let i = 0; i < topLevelNodes; i++) {
    const node = root.getChildAtIndex(i);
    if (node) {
      if (!$isListNode(node)) {
        fullMarkdown += $convertToMarkdownString(TRANSFORMERS, {
          getChildren: () => [node],
        } as unknown as ElementNode) + "\n";
      } else {
        if (!listContainsLIWithKey(node, listItemKey)) {
          const childrenSize = node.getChildrenSize();
          for (let i = 0; i < childrenSize; i++) {
            const child = node.getChildAtIndex(i);
            if ($isListItemNode(child)) {
              fullMarkdown += getListItemMarkdownWithChildren(child, '');
            }
          }
        } else {
          fullMarkdown += getMarkdownUpToListItemFromList(listItemKey, include, node, '');
          break;
        }
      }
    }
  }
  return fullMarkdown;
}