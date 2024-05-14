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
  $addChildListItem,
  $deleteListItem
} from "../lib/list-utils";
import { 
  ListItemNode,
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
            descendants.push(child as ListItemNode);
            descendants.push(...collectDescendants(child));
          } else if ($isListNode(child)) {
            descendants.push(...collectDescendants(child));
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

// if user edits leave us with two adjacent lists, merge them
function mergeListNodesTransform(node: ListNode) {
  const nextSibling = node.getNextSibling();

  if ($isListNode(nextSibling) && $isListNode(node) && nextSibling.getListType() === node.getListType()) {
      console.log("merging lists");
      node.append(...nextSibling.getChildren());
      nextSibling.remove();
  }
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
      (payload) => {
        const { listItem, fixSelection } = payload;
        $deleteListItem(listItem, fixSelection);
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
        $addChildListItem(listItem, true, true);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerNodeTransform(ListNode, mergeListNodesTransform)
  );
}

export function ListCommandsPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerListCommands(editor);
  });

  return null;
}
