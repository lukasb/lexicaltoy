/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { LexicalCommand, LexicalEditor } from "lexical";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_NORMAL,
  INDENT_CONTENT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { mergeRegister } from "@lexical/utils";
import { $getActiveListItem } from "../lib/list-utils";
import {
  DELETE_LISTITEM_COMMAND,
  INDENT_LISTITEM_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  OUTDENT_LISTITEM_COMMAND,
} from "../lib/list-commands";
import { ListItemNode } from "@lexical/list";

// TODO accessibility implications of tab handling?

export function registerKeyboardShortcuts(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand<KeyboardEvent>(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        const listItem = $getActiveListItem(selection);
        if (!listItem) return false;
        event.preventDefault();
        const command: LexicalCommand<{listItem: ListItemNode}> = event.shiftKey
          ? OUTDENT_LISTITEM_COMMAND
          : INDENT_LISTITEM_COMMAND;
        return editor.dispatchCommand(command, { listItem });
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        if (!event.ctrlKey) return false;
        const selection = $getSelection();
        const listItem = $getActiveListItem(selection);
        if (!listItem) return false;
        event.preventDefault();
        editor.dispatchCommand(DELETE_LISTITEM_COMMAND, { listItem });
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_DOWN_COMMAND, // would prever to use KEY_ARROW_UP_COMMAND etc but those don't fire if ctrl is pressed
      (event) => {
        if (!event.ctrlKey || !(event.key == 'ArrowUp' || event.key == 'ArrowDown')) return false;
        const selection = $getSelection();
        const listItem = $getActiveListItem(selection);
        if (!listItem) return false;
        event.preventDefault();
        editor.dispatchCommand(event.key == 'ArrowUp'
          ? MOVE_LISTITEM_UP_COMMAND
          : MOVE_LISTITEM_DOWN_COMMAND,
          { listItem });
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    )
  );
}

export function KeyboardShortcutsPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerKeyboardShortcuts(editor);
  });

  return null;
}
