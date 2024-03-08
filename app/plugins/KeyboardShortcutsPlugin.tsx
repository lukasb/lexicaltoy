/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { LexicalCommand, LexicalEditor, ElementNode } from "lexical";
import { $isRangeSelection } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_NORMAL,
  KEY_BACKSPACE_COMMAND,
  KEY_TAB_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { mergeRegister } from "@lexical/utils";
import { $canIndentListItem, $getActiveListItemFromSelection, $hasChildListItems } from "../lib/list-utils";
import {
  DELETE_LISTITEM_COMMAND,
  INDENT_LISTITEM_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  OUTDENT_LISTITEM_COMMAND,
  PREPEND_NEW_CHILD_COMMAND,
} from "../lib/list-commands";
import { ListItemNode } from "@lexical/list";

function isLast(node: ElementNode): boolean {
  if (node.getNextSibling()) return false;
  const parent = node.getParent();
  if (!parent) return true;
  return isLast(parent);
}

// this looks as if it would incorrectly return true if you're on node B in the following tree:
// A
// - B
// it return false because B is stored as a grandchild of A's next sibling
function isFirst(node: ElementNode): boolean {
  if (node.getPreviousSibling()) return false;
  const parent = node.getParent();
  if (!parent) return true;
  return isFirst(parent);
}

export function registerKeyboardShortcuts(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand<KeyboardEvent>(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        const listItem = $getActiveListItemFromSelection(selection);
        if (!listItem) return false;
        // allow the user to tab out of the note if they're at the beginning or end
        if (
          (!$canIndentListItem(listItem) && !event.shiftKey && isLast(listItem)) ||
          (event.shiftKey && isFirst(listItem))
        ) {
          return false;
        }
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
        const listItem = $getActiveListItemFromSelection(selection);
        const fixSelection = true;
        if (!listItem) return false;
        event.preventDefault();
        editor.dispatchCommand(DELETE_LISTITEM_COMMAND, { listItem, fixSelection });
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_DOWN_COMMAND, // would prever to use KEY_ARROW_UP_COMMAND etc but those don't fire if ctrl is pressed
      (event) => {
        if (
          event.ctrlKey &&
          (event.key == "ArrowUp" || event.key == "ArrowDown")
        ) {
          const selection = $getSelection();
          const listItem = $getActiveListItemFromSelection(selection);
          if (!listItem) return false;
          event.preventDefault();
          editor.dispatchCommand(
            event.key == "ArrowUp"
              ? MOVE_LISTITEM_UP_COMMAND
              : MOVE_LISTITEM_DOWN_COMMAND,
            { listItem }
          );
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const listItem = $getActiveListItemFromSelection(selection);
        if (!listItem) return false;
        // if we're hitting enter at the end of a node that has children, prepend a new child node
        if ($hasChildListItems(listItem) && selection.anchor.offset === listItem.getTextContent().length){
          event.preventDefault();
          editor.dispatchCommand(PREPEND_NEW_CHILD_COMMAND, { listItem });
          return true;
        }
        return false;
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
