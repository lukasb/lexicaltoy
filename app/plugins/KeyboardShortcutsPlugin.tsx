/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { LexicalCommand, LexicalEditor, ElementNode } from "lexical";

import { LexicalNode, DecoratorNode, $isDecoratorNode, $isElementNode, $isRootOrShadowRoot, $isLineBreakNode, $isTextNode, $isRangeSelection, $getAncestor, splitNodeAtPoint, RootNode } from "lexical";

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
import { $canIndentListItem, $getActiveListItem, $hasChildListItems } from "../lib/list-utils";
import {
  DELETE_LISTITEM_COMMAND,
  INDENT_LISTITEM_COMMAND,
  MOVE_LISTITEM_DOWN_COMMAND,
  MOVE_LISTITEM_UP_COMMAND,
  OUTDENT_LISTITEM_COMMAND,
  PREPEND_NEW_CHILD_COMMAND,
} from "../lib/list-commands";
import { ListItemNode } from "@lexical/list";
import { $createListItemNode } from '@lexical/list';
import { $createParagraphNode } from "lexical";
import { $getRoot } from "lexical";
import { $createPoint } from "lexical";
import { RangeSelection } from "lexical";
import { $createRangeSelection } from 'lexical';

function $getAncestor_<NodeType extends LexicalNode = LexicalNode>(
  node: LexicalNode,
  predicate: (ancestor: LexicalNode) => ancestor is NodeType,
) {
  let parent = node;
  console.log("node", node);
  while (parent !== null && parent.getParent() !== null && !predicate(parent)) {
    console.log("parent", parent);
    console.log("predicate", predicate(parent));
    parent = parent.getParentOrThrow();
  }
  console.log("ancestor", parent);
  return predicate(parent) ? parent : null;
}

function splitNodeAtPointt(
  node: LexicalNode,
  offset: number,
): [parent: ElementNode, offset: number] {
  const parent = node.getParent();
  if (!parent) {
    const paragraph = $createParagraphNode();
    $getRoot().append(paragraph);
    paragraph.select();
    return [$getRoot(), 0];
  }

  if ($isTextNode(node)) {
    const split = node.splitText(offset);
    if (split.length === 0) {
      return [parent, node.getIndexWithinParent()];
    }
    const x = offset === 0 ? 0 : 1;
    const index = split[0].getIndexWithinParent() + x;

    return [parent, index];
  }

  if (!$isElementNode(node) || offset === 0) {
    return [parent, node.getIndexWithinParent()];
  }

  const firstToAppend = node.getChildAtIndex(offset);
  if (firstToAppend) {
    const insertPoint = $createRangeSelection();
    insertPoint.focus = $createPoint(node.__key, offset, 'element'),
    insertPoint.anchor = $createPoint(node.__key, offset, 'element'),
    insertPoint.format = 0;
    insertPoint.style = '';
    const newElement = node.insertNewAfter(insertPoint) as ElementNode | null;
    if (newElement) {
      newElement.append(firstToAppend, ...firstToAppend.getNextSiblings());
    }
  }
  return [parent, node.getIndexWithinParent() + 1];
}

export function INTERNAL_$isBlock_(
  node: LexicalNode,
): node is ElementNode | DecoratorNode<unknown> {
  console.log("isBlock", node);
  if ($isDecoratorNode(node) && !node.isInline()) {
    console.log("is decorator node");
    return true;
  }
  if (!$isElementNode(node) || $isRootOrShadowRoot(node)) {
    console.log("not element node or root", node.__key);
    return false;
  }
  console.log("here we go");
  const firstChild = node.getFirstChild();
  const isLeafElement =
    firstChild === null ||
    $isLineBreakNode(firstChild) ||
    $isTextNode(firstChild) ||
    firstChild.isInline();

  console.log("node is inline", node.isInline());
  console.log("node can be empty", node.canBeEmpty());
  console.log("firstChild", firstChild);
  console.log("firstchild islinebreaknode", $isLineBreakNode(firstChild));
  console.log("firstchild istextnode", $isTextNode(firstChild));
  console.log("firstchild isinline", firstChild?.isInline());

  return !node.isInline() && node.canBeEmpty() !== false && isLeafElement;
}


function removeTextAndSplitBlock(selection: RangeSelection): number {
  if (!selection.isCollapsed()) {
    console.log("removeText");
    selection.removeText();
  }

  const anchor = selection.anchor;
  let node = anchor.getNode();
  let offset = anchor.offset;

  console.log("entering while loop", node, offset);
  while (!INTERNAL_$isBlock_(node)) {
    console.log("not internal isblock", node, offset);
    return offset;
    [node, offset] = splitNodeAtPointt(node, offset);
    console.log("ha");
  }
  console.log("done with while loop");
  return offset;
}


function insertParagraph(selection: RangeSelection) {
  console.log("selection node key", selection.anchor.key);
  console.log("here too");
  const index = removeTextAndSplitBlock(selection);
  console.log("index", index);
  const block = $getAncestor_(selection.anchor.getNode(), INTERNAL_$isBlock_)!;
  console.log("block", block);
    const firstToAppend = block.getChildAtIndex(index);
    console.log("firstToAppend", firstToAppend);
    const nodesToInsert = firstToAppend
      ? [firstToAppend, ...firstToAppend.getNextSiblings()]
      : [];
    console.log("nodesToInsert", nodesToInsert);
    const newBlock = block.insertNewAfter(selection, false) as ElementNode | null;
    console.log("newBlock", newBlock);
}

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
        const listItem = $getActiveListItem(selection);
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
        const listItem = $getActiveListItem(selection);
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
          const listItem = $getActiveListItem(selection);
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
        console.log("got here");
        //insertParagraph(selection);
        const listItem = $getActiveListItem(selection);
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
