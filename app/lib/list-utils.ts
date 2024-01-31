import { BaseSelection, $isRootNode, LexicalCommand, createCommand } from "lexical";
import { $isListItemNode, ListItemNode } from "@lexical/list";
import { LexicalNode } from "lexical";

function $isNodeWithinListItem(node: LexicalNode): boolean {
  let parent = node.getParent();
  while (parent && !$isRootNode(parent)) {
    if ($isListItemNode(parent)) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}

// only allow indent/outdent if the selection is collapsed (nothing is selected)
// I don't feel like tackling all the edge cases involved in selection right now

export function $getActiveListItem(
  selection: BaseSelection | null
): ListItemNode | null {
  if (!selection || !selection.isCollapsed()) return null;
  const nodes = selection.getNodes();
  // TODO I think with a collapsed selection, we only need to check the first node
  for (const node of nodes) {
    if ($isListItemNode(node)) return node;
    let parent = node.getParent();
    while (parent && !$isRootNode(parent)) {
      if ($isListItemNode(parent)) {
        return parent;
      }
      parent = parent.getParent();
    }
  }
  return null;
}

export function $canIndentListItem(listItemNode: ListItemNode | null): boolean {
  if (!listItemNode) return false;
  // we can indent if we're a list item and we're not the first child of our parent
  if (listItemNode.getIndexWithinParent() > 0) {
    return true;
  }
  return false;
}

export function $canOutdentListItem(listItemNode: ListItemNode | null): boolean {
  if (!listItemNode) return false;
  const parent = listItemNode.getParent();
  // we can outdent if we're in a nested list
  if (parent && $isNodeWithinListItem(parent)) {
    return true;
  }
  return false;
}

export function $isListItemActive(selection: BaseSelection | null): boolean {
  const listItemNode = $getActiveListItem(selection);
  return listItemNode ? true : false;
}

export function $canIndent(selection: BaseSelection | null): boolean {
   const listItemNode = $getActiveListItem(selection);
   return $canIndentListItem(listItemNode);
 }
 
 export function $canOutdent(selection: BaseSelection | null): boolean {
   const listItemNode = $getActiveListItem(selection);
   return $canOutdentListItem(listItemNode);
 }