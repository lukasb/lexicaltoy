import type { Klass, LexicalEditor, LexicalNode } from "lexical";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { registerLexicalTextEntity } from "@lexical/text";
import { mergeRegister } from "@lexical/utils";
import { useEffect } from "react";

import { $createTextNode, $isTextNode, TextNode, ElementNode, $getSelection, $setSelection, BaseSelection, $isRangeSelection, $createRangeSelection } from "lexical";

import { $getAncestor, INTERNAL_$isBlock } from "lexical/LexicalUtils";

import { WikilinkInternalNode, $createWikilinkInternalNode, WikilinkNode } from "../nodes/WikilinkNode";

export type EntityMatch = { end: number; start: number };

function stripBrackets(input: string): string {
  let result = input;

  // Function to strip one set of brackets
  function stripOnce(str: string): string {
    if (str.startsWith('[')) {
      str = str.substring(1);
    }
    if (str.endsWith(']')) {
      str = str.substring(0, str.length - 1);
    }
    return str;
  }

  // Strip up to two leading and trailing brackets
  for (let i = 0; i < 2; i++) {
    result = stripOnce(result);
  }

  return result;
}

/**
 * Returns a tuple that can be rested (...) into mergeRegister to clean up
 * node transforms listeners that transforms text into another node that extends ElementNode
 * 
 * This is a modified version of registerLexicalTextEntity from the core library
 * 
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
export function registerLexicalElementEntity<T extends ElementNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<T>,
  createNode: () => T
): Array<() => void> {
  const isTargetNode = (node: LexicalNode | null | undefined): node is T => {
    return node instanceof targetNode;
  };

  const replaceTextWithSimpleText = (node: TextNode): void => {
    const textNode = $createTextNode(node.getTextContent());
    textNode.setFormat(node.getFormat());
    node.replace(textNode);
  };

  const replaceElementWithSimpleText = (node: ElementNode): void => {
    // get the current selection position within the node
    const textNode = $createTextNode(node.getTextContent());
    const newnode = node.replace(textNode, false);
    newnode.selectEnd();
  };

  const getMode = (node: TextNode): number => {
    return node.getLatest().__mode;
  };

  const textNodeTransform = (node: TextNode) => {

    console.log('textNodeTransform');

    if (node.getParent() instanceof targetNode) {
      return;
    }

    if (!node.isSimpleText()) {
      return;
    }

    const prevSibling = node.getPreviousSibling();
    let text = node.getTextContent();
    let currentNode = node;
    let match;

    if ($isTextNode(prevSibling)) {
      const previousText = prevSibling.getTextContent();
      const combinedText = previousText + text;
      const prevMatch = getMatch(combinedText);

      if (isTargetNode(prevSibling)) {
        if (prevMatch === null || getMode(prevSibling) !== 0) {
          replaceElementWithSimpleText(prevSibling);

          return;
        } else {
          const diff = prevMatch.end - previousText.length;

          if (diff > 0) {
            const concatText = text.slice(0, diff);
            const newTextContent = previousText + concatText;
            prevSibling.select();
            prevSibling.setTextContent(newTextContent);

            if (diff === text.length) {
              node.remove();
            } else {
              const remainingText = text.slice(diff);
              node.setTextContent(remainingText);
            }

            return;
          }
        }
      } else if (prevMatch === null || prevMatch.start < previousText.length) {
        return;
      }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      match = getMatch(text);
      let nextText = match === null ? "" : text.slice(match.end);
      text = nextText;

      if (nextText === "") {
        const nextSibling = currentNode.getNextSibling();

        if ($isTextNode(nextSibling)) {
          nextText =
            currentNode.getTextContent() + nextSibling.getTextContent();
          const nextMatch = getMatch(nextText);

          if (nextMatch === null) {
            if (isTargetNode(nextSibling)) {
              replaceElementWithSimpleText(nextSibling);
            } else {
              nextSibling.markDirty();
            }

            return;
          } else if (nextMatch.start !== 0) {
            return;
          }
        }
      } else {
        const nextMatch = getMatch(nextText);

        if (nextMatch !== null && nextMatch.start === 0) {
          return;
        }
      }

      if (match === null) {
        return;
      }

      if (
        match.start === 0 &&
        $isTextNode(prevSibling) &&
        prevSibling.isTextEntity()
      ) {
        continue;
      }

      let nodeToReplace;

      if (match.start === 0) {
        [nodeToReplace, currentNode] = currentNode.splitText(match.end);
      } else {
        [, nodeToReplace, currentNode] = currentNode.splitText(
          match.start,
          match.end
        );
      }

      const selection = $getSelection();
      if (selection === null || !$isRangeSelection(selection) || !selection.isCollapsed()) {
        console.log('selection is null');
        return;
      }
      const selectionCopy = selection.clone();
      const replacementNode = createNode();
      
      const node = selection.getNodes()[0];
      const start = selection.anchor.offset;

      const openingBracket = $createWikilinkInternalNode('[[');
      replacementNode.append(openingBracket);
      const title = $createWikilinkInternalNode(stripBrackets(nodeToReplace.getTextContent()));
      replacementNode.append(title);
      const endBracket = $createWikilinkInternalNode(']]');
      replacementNode.append(endBracket);
      nodeToReplace.replace(replacementNode);

      if (start < 2) {
        openingBracket.select(start, start);
      } else if (start < title.getTextContent().length + 2) {
        title.select(start - 2, start - 2);
      } else {
        endBracket.select(start - title.getTextContent().length - 2, start - title.getTextContent().length - 2);
      }

      //selectionCopy.insertNodes([replacementNode]);
      //$setSelection(selectionCopy);
    
      if (currentNode == null) {
        return;
      }
    }
  };

  const reverseNodeTransform = (node: T) => {
  
    console.log('reverseNodeTransform');

    const text = node.getTextContent();
    const match = getMatch(text);

    if (match === null || match.start !== 0) {
      console.log('match is null or start is not 0');
      replaceElementWithSimpleText(node);
      return;
    }

    if (text.length > match.end) {

      console.log('text length is greater than match end');

      // need to move all nodes (and parts of nodes) after the match.end out of the node

      let lengthSoFar = 0;
      let nodesToMoveOut = [];
      for (let i = 0; i < node.getChildrenSize(); i++) {
        const child = node.getChildAtIndex(i);
        if (lengthSoFar > match.end && child) {
          nodesToMoveOut.push(child);
        } else if (!$isTextNode(child)) {
          continue;
        } else {
          const childText = child.getTextContent();
          const childLength = childText.length;
          if (lengthSoFar + childLength > match.end) {
            const splitIndex = match.end - lengthSoFar;
            const [before, after] = child.splitText(splitIndex);
            if (after && after.getTextContent().length > 0) {
              nodesToMoveOut.push(after);
            }
          }
          lengthSoFar += childLength;
        }
      }

      if (nodesToMoveOut.length > 0) {
        for (let i = 0; i < nodesToMoveOut.length; i++) {
          const child = nodesToMoveOut[i];
          child.remove();
          node.insertAfter(child);
        }
      }

      return;
    }

    return;
    const prevSibling = node.getPreviousSibling();

    if ($isTextNode(prevSibling) && prevSibling.isTextEntity()) {
      replaceTextWithSimpleText(prevSibling);
      replaceElementWithSimpleText(node);
    }

    const nextSibling = node.getNextSibling();

    if ($isTextNode(nextSibling) && nextSibling.isTextEntity()) {
      replaceTextWithSimpleText(nextSibling);

      // This may have already been converted in the previous block
      if (isTargetNode(node)) {
        replaceElementWithSimpleText(node);
      }
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

function handleWikilinkInternalNodeTransform(node: WikilinkInternalNode): void {
  node.getParent()?.markDirty();
}

// this only works for elements that contain text nodes only
export function useLexicalElementEntity<T extends ElementNode>(
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<T>,
  createNode: (textNode: TextNode) => T
): void {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      ...registerLexicalElementEntity(editor, getMatch, targetNode, createNode),
      editor.registerNodeTransform(WikilinkInternalNode, handleWikilinkInternalNodeTransform)
    );
  }, [createNode, editor, getMatch, targetNode]);
}
