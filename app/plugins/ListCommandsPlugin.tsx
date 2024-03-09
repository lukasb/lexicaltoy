import type { LexicalEditor, ElementNode } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $setSelection, COMMAND_PRIORITY_EDITOR } from "lexical";
import { useEffect } from "react";
import { mergeRegister } from "@lexical/utils";
import {
  DELETE_LISTITEM_COMMAND,
  INDENT_LISTITEM_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  OUTDENT_LISTITEM_COMMAND,
  PREPEND_NEW_CHILD_COMMAND,
} from "../lib/list-commands";
import {
  $canIndentListItem,
  $canOutdentListItem,
  $getListContainingChildren,
  $getListItemContainingChildren,
  $getPreviousListItem,
  $isNestedListItem,
} from "../lib/list-utils";
import { 
  ListItemNode,
  $createListItemNode,
  $createListNode,
  ListNode,
  $isListItemNode,
  $isListNode
} from "@lexical/list";

function indentOutdentListItemAndChildren(listItem: ListItemNode, indentChange: number) {
  function collectDescendants(node: ListNode | ListItemNode): ListItemNode[] {
    let descendants: ListItemNode[] = [];
    const children = node.getChildren();
    if (children) {
      children.forEach(child => {
        if (child) {
          if ($isListItemNode(child)) {
            descendants.push(child as ListItemNode);  // Add direct child
            descendants.push(...collectDescendants(child));
          } else if ($isListNode(child)) {
            descendants.push(...collectDescendants(child)); // Add child's descendants
          }
        }
      });
    }
    return descendants;
  }
  // if the node has children, they're in a list node that's a child of its next sibling
  // $getListItemContainingChildren gets that next sibling
  let nodesToChange: ListItemNode[] = [];
  const listItemContainingChildren = $getListItemContainingChildren(listItem);
  if (listItemContainingChildren) {
    nodesToChange.push(...collectDescendants(listItemContainingChildren));
  }
  nodesToChange.push(listItem);

  // we have to build the list before changing indents, because changing indents will
  // change the node tree and we won't be able to find the children
  nodesToChange.forEach(node => {
    node.setIndent(node.getIndent() + indentChange);
  });
}

function removeListItemAndChildren(listItem: ListItemNode) {
  let nodesToRemove: ListItemNode[] = [];
  nodesToRemove.push(listItem);
  const childrenList = $getListContainingChildren(listItem);
  if (childrenList && childrenList.getChildren()) {
    nodesToRemove.push($getListItemContainingChildren(listItem) as ListItemNode);
    nodesToRemove.push(...childrenList.getChildren() as ListItemNode[]);
  }
  for (let node of nodesToRemove) {
    node.remove();
  }
}

// return true if we're the only child of our parent
// (if we have children they will appear as the grandchildren of a sibling of ours)
function isOnlyChild(listItem: ListItemNode): boolean {
  if (
    $isNestedListItem(listItem) &&
    listItem.getIndexWithinParent() === 0 &&
    listItem.getParent().getChildrenSize() === 1
  ) {
    return true;
  }
  if (
    $isNestedListItem(listItem) &&
    listItem.getIndexWithinParent() === 0 &&
    listItem.getParent().getChildrenSize() === 2
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

export function registerListCommands(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      OUTDENT_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        if ($canOutdentListItem(listItem)) {
          indentOutdentListItemAndChildren(listItem, -1);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INDENT_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        if ($canIndentListItem(listItem)) {
          indentOutdentListItemAndChildren(listItem, 1);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      DELETE_LISTITEM_COMMAND,
      (payload, fixSelection) => {
        const { listItem } = payload;
        if (isOnlyChild(listItem)) {
          // if we're an only child and we don't delete our grandparent list item, removal
          // leaves an empty listitem
          removeListItemAndChildren(listItem.getParent().getParent());
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
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      MOVE_LISTITEM_DOWN_COMMAND,
      (payload) => {
        const { listItem } = payload;
        console.log("down", listItem);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      MOVE_LISTITEM_UP_COMMAND,
      (payload) => {
        const { listItem } = payload;
        console.log("up", listItem);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      PREPEND_NEW_CHILD_COMMAND,
      (payload) => {
        const { listItem } = payload;
        const newListItem = $createListItemNode();
        let childrenList = $getListContainingChildren(listItem);
        if (childrenList) {
          if (childrenList.getChildrenSize() > 0) {
            childrenList.getChildren()[0].insertBefore(newListItem);
          } else {
            childrenList.getChildren().push(newListItem);
          }
        } else {
          childrenList = $createListNode((listItem.getParent() as ListNode).getListType());
          childrenList.append(newListItem);
          const newSibling = $createListItemNode();
          newSibling.append(childrenList);
          listItem.insertAfter(newSibling);
          const cList = $getListContainingChildren(listItem);
        }
        newListItem.selectEnd();
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    )
  );
}

export function ListCommandsPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerListCommands(editor);
  });

  return null;
}
