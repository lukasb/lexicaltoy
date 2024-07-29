import {
  $isElementNode,
  $isTextNode,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  SerializedTextNode,
} from "lexical";
import { $generateNodesFromSerializedNodes } from "@lexical/clipboard";

interface BaseSerializedNode {
  children?: Array<BaseSerializedNode>;
  type: string;
  version: number;
}

function exportNodeToJSON<T extends LexicalNode>(node: T): BaseSerializedNode {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;

  return serializedNode;
}

// modified from lexical-clipboard
// TODO instead of copy this in and modifying, could create an artifical selection
// which I never call setSelection() with and pass that to $generateJSONFromSelectedNodes
export function $appendNodesToJSON(
  editor: LexicalEditor,
  currentNode: LexicalNode,
  targetArray: Array<BaseSerializedNode> = []
): boolean {
  let shouldInclude = true;
  let target = currentNode;
  const shouldExclude =
    $isElementNode(currentNode) && currentNode.excludeFromCopy("html");

  const children = $isElementNode(target) ? target.getChildren() : [];
  const serializedNode = exportNodeToJSON(target);

  // TODO: TextNode calls getTextContent() (NOT node.__text) within it's exportJSON method
  // which uses getLatest() to get the text from the original node with the same key.
  // This is a deeper issue with the word "clone" here, it's still a reference to the
  // same node as far as the LexicalEditor is concerned since it shares a key.
  // We need a way to create a clone of a Node in memory with it's own key, but
  // until then this hack will work for the selected text extract use case.
  if ($isTextNode(target)) {
    const text = target.__text;
    // If an uncollapsed selection ends or starts at the end of a line of specialized,
    // TextNodes, such as code tokens, we will get a 'blank' TextNode here, i.e., one
    // with text of length 0. We don't want this, it makes a confusing mess. Reset!
    if (text.length > 0) {
      (serializedNode as SerializedTextNode).text = text;
    } else {
      shouldInclude = false;
    }
  }

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    const shouldIncludeChild = $appendNodesToJSON(
      editor,
      childNode,
      serializedNode.children
    );

    if (
      !shouldInclude &&
      $isElementNode(currentNode) &&
      shouldIncludeChild &&
      currentNode.extractWithChild(childNode, null, "clone")
    ) {
      shouldInclude = true;
    }
  }

  if (shouldInclude && !shouldExclude) {
    targetArray.push(serializedNode);
  } else if (Array.isArray(serializedNode.children)) {
    for (let i = 0; i < serializedNode.children.length; i++) {
      const serializedChildNode = serializedNode.children[i];
      targetArray.push(serializedChildNode);
    }
  }

  return shouldInclude;
}

export function $appendNodes(parent: ElementNode, serializedNodes: BaseSerializedNode[]) {
  const nodes = $generateNodesFromSerializedNodes(serializedNodes);
  parent.append(...nodes);
}
