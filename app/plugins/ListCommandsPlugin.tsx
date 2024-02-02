import type { LexicalEditor } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_EDITOR } from "lexical";
import { useEffect } from "react";
import { mergeRegister } from "@lexical/utils";
import {
  DELETE_LISTITEM_COMMAND,
  INDENT_LISTITEM_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  OUTDENT_LISTITEM_COMMAND,
} from "../lib/list-commands";
import {
  $canIndentListItem,
  $canOutdentListItem,
  $getListItemContainingChildren,
  $isNestedListItem,
} from "../lib/list-utils";
import { $isListNode, ListItemNode } from "@lexical/list";

function changeChildrenIndent(childrenListItem: ListItemNode | null, change: number, skipFirst: boolean) {
  if (childrenListItem) {
    let list = childrenListItem.getFirstChild();
    if (list && $isListNode(list)) {
      const children = list.getChildren();
      for (let i = skipFirst ? 1 : 0; i < children.length; i++) {
        const child = children[i];
        if (child instanceof ListItemNode) {
          child.setIndent(child.getIndent() + change);
        }
      }
    }
  }
}

export function registerListCommands(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      OUTDENT_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        const indent = listItem.getIndent();
        if ($canOutdentListItem(listItem)) {
          const childrenListItem = $getListItemContainingChildren(listItem);
          listItem.setIndent(indent - 1);
          changeChildrenIndent(childrenListItem, -1, false);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INDENT_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        const indent = listItem.getIndent();
        if ($canIndentListItem(listItem)) {
          const childrenListItem = $getListItemContainingChildren(listItem);
          listItem.setIndent(indent + 1);
          // skip the first child here because the node we just indented is now that child
          changeChildrenIndent(childrenListItem, 1, true);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      DELETE_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        // if the list item is the first item in a nested list and has no siblings remove the grandparent <li>
        // see getListItemContainingChildren for more info
        if ($isNestedListItem(listItem) && 
            listItem.getIndexWithinParent() === 0 &&
            listItem.getParent().getChildrenSize() === 1
        ) {
          listItem.getParent().getParent().remove();
        } else {
          const childrenNode = $getListItemContainingChildren(listItem);
          listItem.remove();
          if (childrenNode) childrenNode.remove();
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
