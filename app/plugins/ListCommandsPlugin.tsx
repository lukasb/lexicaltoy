import type { LexicalEditor } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_EDITOR, COMMAND_PRIORITY_NORMAL } from "lexical";
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
  $isNestedListItem,
} from "../lib/list-utils";

export function registerListCommands(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      OUTDENT_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        const indent = listItem.getIndent();
        if ($canOutdentListItem(listItem)) {
          listItem.setIndent(indent - 1);
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
          listItem.setIndent(indent + 1);
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      DELETE_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        // nested lists are stored in a sibling <li> to the parent list item
        // so if we're in a nested list it looks like <li><ul><li>
        // if the list item is the first item in a nested list and has no siblings remove the grandparent <li>
        if ($isNestedListItem(listItem) && 
            listItem.getIndexWithinParent() === 0 &&
            listItem.getParent().getChildrenSize() === 1
        ) {
          console.log("byebye");
          listItem.getParent().getParent().remove();
        } else {
          listItem.remove();
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      MOVE_LISTITEM_DOWN_COMMAND,
      (payload) => {
        const { listItem } = payload;
        console.log("down", listItem);
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      MOVE_LISTITEM_UP_COMMAND,
      (payload) => {
        const { listItem } = payload;
        console.log("up", listItem);
        return false;
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
