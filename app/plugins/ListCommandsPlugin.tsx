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
  $getListContainingChildren,
  $isNestedListItem,
} from "../lib/list-utils";
import { ListItemNode } from "@lexical/list";

function indentOutdentListItemAndChildren(listItem: ListItemNode, indentChange: number) {
  let nodesToOutdent: ListItemNode[] = [];
  nodesToOutdent.push(listItem);
  const childrenList = $getListContainingChildren(listItem);
  if (childrenList && childrenList.getChildren()) {
    nodesToOutdent.push(...childrenList.getChildren() as ListItemNode[]);
  }
  for (let node of nodesToOutdent) {
    node.setIndent(node.getIndent() + indentChange);
  }
}

function removeListItemAndChildren(listItem: ListItemNode) {
  let nodesToRemove: ListItemNode[] = [];
  nodesToRemove.push(listItem);
  const childrenList = $getListContainingChildren(listItem);
  if (childrenList && childrenList.getChildren()) {
    nodesToRemove.push(...childrenList.getChildren() as ListItemNode[]);
  }
  for (let node of nodesToRemove) {
    node.remove();
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
        const { listItem } = payload;
        if ($isNestedListItem(listItem) && 
            listItem.getIndexWithinParent() === 0 &&
            listItem.getParent().getChildrenSize() === 1
        ) {
          // if we're an only child and we don't delete our grantparent list item, removal
          // leaves an empty listitem
          listItem.getParent().getParent().remove();
        } else {
          removeListItemAndChildren(listItem);
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
