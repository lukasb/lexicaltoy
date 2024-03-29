import { BaseSelection, $isRootNode, $isRangeSelection, $isNodeSelection } from "lexical";
import { $isListItemNode, $isListNode, ListItemNode, ListNode } from "@lexical/list";
import { LexicalNode } from "lexical";

export function $isNodeWithinListItem(node: LexicalNode): boolean {
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

export function $getActiveListItemFromSelection(
  selection: BaseSelection | null
): ListItemNode | null {
  if (!selection) return null;
  if ($isRangeSelection(selection)) {
    if (!selection.isCollapsed()) return null;
    const node = selection.anchor.getNode();
    if ($isListItemNode(node)) return node;
    let parent = node.getParent();
    while (parent && !$isRootNode(parent)) {
      if ($isListItemNode(parent)) {
        return parent;
      }
      parent = parent.getParent();
    }
  } else if ($isNodeSelection(selection)) {
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
  const listItemNode = $getActiveListItemFromSelection(selection);
  return listItemNode ? true : false;
}

export function $canIndent(selection: BaseSelection | null): boolean {
   const listItemNode = $getActiveListItemFromSelection(selection);
   return $canIndentListItem(listItemNode);
 }
 
 export function $canOutdent(selection: BaseSelection | null): boolean {
   const listItemNode = $getActiveListItemFromSelection(selection);
   return $canOutdentListItem(listItemNode);
 }

 export function $isNestedListItem(listItem: ListItemNode): boolean {
  const grandparent = listItem.getParent().getParent();
  return grandparent && $isListItemNode(grandparent);
 }

 export function $hasChildListItems(listItem: ListItemNode): boolean {
  return $getListItemContainingChildren(listItem) !== null;
 }
 
 // if a node ABC has a child DEF, it's represented like this
 // <li>ABC</li>
 // <li id="2"><ul><li>DEF</li></ul></li>
 // in this example, we return the <li> with id="2"
 export function $getListItemContainingChildren(listItem: ListItemNode): ListItemNode | null {
  const nextSibling = listItem.getNextSibling();
  if (!nextSibling) return null;
  if (nextSibling instanceof ListItemNode && $isListNode(nextSibling.getChildAtIndex(0))) {
    return nextSibling;
  }
  return null;
}

export function $getListContainingChildren(listItem: ListItemNode): ListNode | null {
  const listItemContainingChildren = $getListItemContainingChildren(listItem);
  if (listItemContainingChildren) {
    if (listItemContainingChildren.getChildrenSize() > 0) {
      return listItemContainingChildren.getChildAtIndex(0) as ListNode;
    }
  }
  return null;
}

function containsList(listItem: ListItemNode): boolean {
  return $isListNode(listItem.getChildAtIndex(0));
}

function getLastDescendantListItem(listItem: ListItemNode): ListItemNode | null {
  const child = listItem.getChildAtIndex(0);
  if (child && child instanceof ListNode) {
    const lastChild = child.getChildAtIndex(child.getChildrenSize() - 1) as ListItemNode;
    if (!lastChild) return null;
    if (lastChild.getChildrenSize() > 0 && containsList(lastChild)) return getLastDescendantListItem(lastChild);
    return lastChild;
  }
  return null;
}

// get the previous list item regardless of indentation
// (what you would expect to reach by hitting up arrow)
export function $getPreviousListItem(listItem: ListItemNode): ListItemNode | null {
  const previousSibling = listItem.getPreviousSibling() as ListItemNode;
  if (!previousSibling) return null;
  if (previousSibling.getChildrenSize() === 0) return previousSibling;
  return getLastDescendantListItem(previousSibling);
}