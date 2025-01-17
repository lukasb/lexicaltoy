import { 
  BaseSelection, 
  $isRootNode, 
  $isRangeSelection, 
  $isNodeSelection,
  $createTextNode,
  $isElementNode
} from "lexical";
import { 
  ListItemNode,
  $createListItemNode,
  $createListNode,
  ListNode,
  $isListItemNode,
  $isListNode,
} from "@lexical/list";
import { LexicalNode } from "lexical";

export function $isNodeWithinListItem(node: LexicalNode): boolean {
  return getListItemParentNode(node) !== null;
}

export function getListItemParentNode(node: LexicalNode): ListItemNode | null {
  let parent = node.getParent();
  while (parent && !$isRootNode(parent)) {
    if ($isListItemNode(parent)) {
      return parent;
    }
    parent = parent.getParent();
  }
  return null;
}

export function $getListItemContainingNode(node: LexicalNode): ListItemNode | null {
  if ($isListItemNode(node)) return node;
  let parent = node.getParent();
  while (parent && !$isRootNode(parent)) {
    if ($isListItemNode(parent)) {
      return parent;
    }
    parent = parent.getParent();
  }
  return null;
}

export function getAncestorListItem(listItemNode: ListItemNode): ListItemNode | null {
  let parent = listItemNode.getParent();
  while (parent && !$isRootNode(parent)) {
    if ($isListItemNode(parent)) {
      return parent;
    }
    parent = parent.getParent();
  }
  return null;
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
    return $getListItemContainingNode(node);
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
  if (listItemNode.getIndexWithinParent() === 0) return false;

  // and if our previous sibling, if any, is not a formula node
  const previousSibling = listItemNode.getPreviousSibling();
  if (previousSibling && $isElementNode(previousSibling)) {
    if (
      previousSibling.getFirstChild()?.getType() === "formula-display" ||
      previousSibling.getFirstChild()?.getType() === "formula-editor"
    ) {
      return false;
    } else if (previousSibling.getType() === "list") {
      // previous sibling is children of previous previous sibling, 
      // so we need to check if previous previous sibling is a formula
      const previousSiblingOfPreviousSibling =
        previousSibling.getPreviousSibling();
      if (
        previousSiblingOfPreviousSibling &&
        $isElementNode(previousSiblingOfPreviousSibling)
      ) {
        if (
          previousSiblingOfPreviousSibling.getFirstChild()?.getType() ===
          "formula-display"
        ) {
          return false;
        }
      }
    }
  }

  return true;
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
  const grandparent = listItem.getParent()?.getParent();
  return $isListItemNode(grandparent);
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

export function getNextListItem(listItem: ListItemNode, skipChildren: boolean): ListItemNode | null {
  let nextSibling = listItem.getNextSibling() as ListItemNode;
  if (nextSibling) {
    const child = nextSibling.getChildAtIndex(0);
    if ($isListNode(child)) {
      if (!skipChildren) {
        return child.getChildAtIndex(0) as ListItemNode;
      } else {
        nextSibling = nextSibling.getNextSibling() as ListItemNode;
      }
    }
  }
  if (nextSibling) {  
    return nextSibling;
  } else {
    // traverse up the tree until we find a sibling
    let parentList = listItem.getParent() as ListNode;
    let parentListItem = parentList.getParent() as ListItemNode;
    while (parentList && parentListItem) {
      const nextSibling = parentListItem.getNextSibling() as ListItemNode;
      if (nextSibling) {
        return nextSibling;
      }
      parentList = parentListItem.getParent() as ListNode;
      parentListItem = parentList.getParent() as ListItemNode;
    }
  }
  return null;
}

export function $getOrAddListContainingChildren(parent: ListItemNode): ListNode {
  let listNode = $getListContainingChildren(parent);
  if (listNode) return listNode;
  const listItemNode = new ListItemNode();
  parent.insertAfter(listItemNode, false);
  listNode = new ListNode("bullet", 0);
  listItemNode.append(listNode);
  return listNode;
}

export function $addChildListItem(parent: ListItemNode, prepend: boolean, changeSelection: boolean, child?: ListItemNode) {
  
  const newListItem = child || $createListItemNode();

  let childrenList = $getListContainingChildren(parent);
  if (childrenList) {
    if (childrenList.getChildrenSize() > 0 && prepend) {
      childrenList.getChildren()[0].insertBefore(newListItem);
    } else {
      childrenList.append(newListItem);
    }
  } else {
    childrenList = $createListNode((parent.getParent() as ListNode).getListType());
    childrenList.append(newListItem);
    const newSibling = $createListItemNode();
    newSibling.append(childrenList);
    parent.insertAfter(newSibling);
  }
  if (changeSelection) newListItem.selectEnd();
}

// return true if we're the only child of our parent
// (if we have children they will appear as the grandchildren of a sibling of ours)
function isOnlyChild(listItem: ListItemNode): boolean {
  if (
    $isNestedListItem(listItem) &&
    listItem.getIndexWithinParent() === 0 &&
    listItem.getParent()?.getChildrenSize() === 1
  ) {
    return true;
  }
  if (
    $isNestedListItem(listItem) &&
    listItem.getIndexWithinParent() === 0 &&
    listItem.getParent()?.getChildrenSize() === 2
  ) {
    const nextSibling = listItem.getNextSibling() as ListItemNode;
    if (nextSibling &&
      nextSibling.getChildrenSize() === 1) {
        const siblingChild = nextSibling.getChildAtIndex(0);
        if (siblingChild && siblingChild.getType() === "list") {
          return true;
        }
      }
    }
    return false;
}

function getChildrenToRemove(listItem: ListItemNode): ListItemNode[] {
  const nodesToRemove: ListItemNode[] = [];
  const childrenList = $getListContainingChildren(listItem);
  if (childrenList && childrenList.getChildren()) {
    nodesToRemove.push($getListItemContainingChildren(listItem) as ListItemNode);
    nodesToRemove.push(...childrenList.getChildren() as ListItemNode[]);
  }
  return nodesToRemove;
}

export function $deleteChildrenFromListItem(listItem: ListItemNode) { 
  const nodesToRemove = getChildrenToRemove(listItem);
  for (let node of nodesToRemove) {
    if (node) node.remove();
  }
}

function removeListItemAndChildren(listItem: ListItemNode) {
  let nodesToRemove: ListItemNode[] = [];
  nodesToRemove.push(listItem);
  nodesToRemove.push(...getChildrenToRemove(listItem));
  for (let node of nodesToRemove) {
    node.remove();
  }
}

export function $deleteListItem(listItem: ListItemNode, fixSelection: boolean) {
  if (isOnlyChild(listItem)) {
    // if we're an only child and we don't delete our grandparent list item, removal
    // leaves an empty listitem
    const grandparent = listItem.getParent()?.getParent();
    if (grandparent && $isListItemNode(grandparent)) removeListItemAndChildren(grandparent);
  } else {
    let previousListItem: ListItemNode | null = null;
    if (fixSelection) {
      previousListItem = $getPreviousListItem(listItem);
    }
    removeListItemAndChildren(listItem);
    if (fixSelection && previousListItem) {
      previousListItem.selectEnd();
    }
  }
}

export function getListItemFromSelection(selection: BaseSelection): ListItemNode | null {
  if (
    selection === null ||
    !$isRangeSelection(selection) ||
    !selection.isCollapsed()
  ) {
    return null;
  }
  const node = selection.anchor.getNode().getParent();
  if (node instanceof ListItemNode) {
    return node;
  } else if (node instanceof ListNode) {
    return selection.anchor.getNode() as ListItemNode;
  }
  return null;
}
