import type { LexicalEditor } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_EDITOR, COMMAND_PRIORITY_NORMAL } from "lexical";
import { useEffect } from "react";
import { mergeRegister } from "@lexical/utils";
import {
  DELETE_LISTITEM_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
} from "../lib/list-commands";

export function registerListCommands(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      DELETE_LISTITEM_COMMAND,
      (payload) => {
        const { listItem } = payload;
        console.log("delete", listItem);
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
