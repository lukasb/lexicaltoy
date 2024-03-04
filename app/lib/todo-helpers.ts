import type { Klass, LexicalEditor, LexicalNode } from "lexical";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { useEffect } from "react";

import { 
  $createTextNode,
  $isTextNode,
  TextNode,
  ElementNode,
  $getSelection,
  $isRangeSelection,
} from "lexical";

import { ListItemNode } from "@lexical/list"

import {
  $createTodoNode, TodoNode,
  $createTodoStatusNode, TodoStatusNode,
  $createTodoCheckboxNode, TodoCheckboxNode,
  $createTodoTextNode, TodoTextNode,
  TodoStatus
} from '@/app/nodes/TodoNode';

/**
 * Returns a tuple that can be rested (...) into mergeRegister to clean up
 * node transforms listeners that transforms text into another node that extends ElementNode
 * 
 * This is a modified version of registerLexicalTextEntity from the core library
 * TODO make sure the below doesn't stay true when we're done editing this
 * WARNING this function only works if the ElementNode contains TextNodes only
 * 
 * @example
 * ```ts
 *   useEffect(() => {
    return mergeRegister(
      ...registerLexicalTextEntity(editor, getMatch, targetNode, createNode),
    );
  }, [createNode, editor, getMatch, targetNode]);
 * ```
 * Where targetNode is the type of node containing the text you want to transform (like a text input),
 * then getMatch uses a regex to find a matching text and creates the proper node to include the matching text.
 * @param editor - The lexical editor.
 * @param getMatch - Finds a matching string that satisfies a regex expression.
 * @param targetNode - The node type that contains text to match with. eg. HashtagNode
 * @param createNode - A function that creates a new node to contain the matched text. eg createHashtagNode
 * @returns An array containing the plain text and reverse node transform listeners.
 */
export function registerLexicalTodoEntity<T extends ElementNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | TodoStatus,
  targetNode: Klass<T>,
  createNode: () => T
): Array<() => void> {
  const isTargetNode = (node: LexicalNode | null | undefined): node is T => {
    return node instanceof targetNode;
  };

  const replaceElementWithSimpleText = (node: ElementNode): void => {
    const selection = $getSelection();
    let offset = -1;
    // TODO okay we can do better than this
    if (selection != null && $isRangeSelection(selection) && selection.isCollapsed()) {
      if (node.getChildren()[0] === selection.anchor.getNode()) {
        offset = selection.anchor.offset;
      }
    }
    const textNode = $createTextNode(node.getTextContent());
    const newnode = node.replace(textNode, false);
    if (offset !== -1) {
      newnode?.select(offset, offset);
    } else {
      newnode.selectEnd();
    }
  };

  const getMode = (node: TextNode): number => {
    return node.getLatest().__mode;
  };

  const textNodeTransform = (node: TextNode) => {
    //if (node.getParent() instanceof targetNode) {
    //  return;
    //}

    console.log("textNodeTransform", node.getTextContent());
    // we only create todo items in list nodes
    if (!(node.getParent() instanceof ListItemNode)) {
      return;
    }

    if (!node.isSimpleText()) {
      return;
    }

    const selection = $getSelection();
    if (
      selection === null ||
      !$isRangeSelection(selection) ||
      !selection.isCollapsed()
    ) {
      return;
    }

    const selectionNodes = selection.getNodes();
    if (selectionNodes?.includes(node)) {
      console.log("has selection");
      return;
    }

    const prevSibling = node.getPreviousSibling();
    let text = node.getTextContent();
    let currentNode = node;
    let match;

    match = getMatch(text);

    if (match === null) {
      return;
    }

    const replacementNode = createNode();
    const start = selection.anchor.offset;

    const checkboxNode = $createTodoCheckboxNode(match === "DONE");
    replacementNode.append(checkboxNode);
    const statusNode = $createTodoStatusNode(match);
    replacementNode.append(statusNode);

    const spaceNode = $createTodoTextNode(" ");
    replacementNode.append(spaceNode);

    const textMinusMatch = text.slice(match.length + 1);
    const textNode = $createTodoTextNode(textMinusMatch);
    replacementNode.append(textNode);

    currentNode.replace(replacementNode);
    textNode.select(start, start);
  };

  const reverseNodeTransform = (node: T) => {
    
    const text = node.getTextContent();
    const match = getMatch(text);
    const selection = $getSelection();
    const selectionNodes = selection?.getNodes();

    // if match is null or node is in selectionNodes
    if (match === null || selectionNodes?.includes(node)) {
      replaceElementWithSimpleText(node);
    }

  };

  const removePlainTextTransform = editor.registerNodeTransform(
    TextNode,
    textNodeTransform
  );
  const removeReverseNodeTransform = editor.registerNodeTransform<T>(
    targetNode,
    reverseNodeTransform
  );

  return [removePlainTextTransform, removeReverseNodeTransform];
}

// this only works for elements that contain text nodes only
export function useLexicalTodoEntity<T extends ElementNode>(
  getMatch: (text: string) => null | TodoStatus,
  targetNode: Klass<T>,
  createNode: () => T
): void {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      ...registerLexicalTodoEntity(editor, getMatch, targetNode, createNode)
    );
  }, [createNode, editor, getMatch, targetNode]);
}
