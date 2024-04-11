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
import { 
  WikilinkInternalNode,
  $createWikilinkInternalNode
} from "../nodes/WikilinkNode";
import { $isFormattableTextNode } from '@/app/nodes/FormattableTextNode';

export type EntityMatch = { end: number; start: number };

export function stripBrackets(input: string): string {
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

  const replaceElementWithSimpleText = (node: ElementNode): void => {
    const selection = $getSelection();
    let offset = -1;
    // TODO okay we can do better than this
    if (selection != null && $isRangeSelection(selection) && selection.isCollapsed()) {
      if (node.getChildren()[0] === selection.anchor.getNode()) {
        offset = selection.anchor.offset;
      } else if (node.getChildren()[1] === selection.focus.getNode()) {
        offset = selection.focus.offset + 2;
      } else if (node.getChildren()[2] === selection.focus.getNode()) {
        offset = selection.focus.offset + 2 + node.getChildren()[1].getTextContent().length;
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

    if (node.getParent() instanceof targetNode) {
      return;
    }

    if (!node.isSimpleText() && !$isFormattableTextNode(node)) {
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
        return;
      }

      const replacementNode = createNode();
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
    
      if (currentNode == null) {
        return;
      }
    }
  };

  const reverseNodeTransform = (node: T) => {
    
    const text = node.getTextContent();
    const match = getMatch(text);

    if (match === null) {
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

// the best way I could find to get wikilink nodes to turn back into text nodes when they no longer match the format
// so every time we edit a node inside a WikilinkNode, we mark the parent (the WikilinkNode) as dirty so its reverse node transform is called
function handleWikilinkInternalNodeTransform(node: WikilinkInternalNode): void {
  node.getParent()?.markDirty();
}

// this only works for elements that contain text nodes only
export function useLexicalElementEntity<T extends ElementNode>(
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<T>,
  createNode: () => T
): void {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      ...registerLexicalElementEntity(editor, getMatch, targetNode, createNode),
      editor.registerNodeTransform(WikilinkInternalNode, handleWikilinkInternalNodeTransform)
    );
  }, [createNode, editor, getMatch, targetNode]);
}
