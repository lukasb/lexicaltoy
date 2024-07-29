import {
  $createParagraphNode,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  DecoratorNode,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  SerializedTextNode,
  $isRootNode,
  $isRootOrShadowRoot,
  ParagraphNode,
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

function INTERNAL_$isBlock(
  node: LexicalNode
): node is ElementNode | DecoratorNode<unknown> {
  if ($isRootNode(node) || ($isDecoratorNode(node) && !node.isInline())) {
    return true;
  }
  if (!$isElementNode(node) || $isRootOrShadowRoot(node)) {
    return false;
  }

  const firstChild = node.getFirstChild();
  const isLeafElement =
    firstChild === null ||
    $isLineBreakNode(firstChild) ||
    $isTextNode(firstChild) ||
    firstChild.isInline();

  return !node.isInline() && node.canBeEmpty() !== false && isLeafElement;
}

function $getAncestor<NodeType extends LexicalNode = LexicalNode>(
  node: LexicalNode,
  predicate: (ancestor: LexicalNode) => ancestor is NodeType,
) {
  let parent = node;
  while (parent !== null && parent.getParent() !== null && !predicate(parent)) {
    parent = parent.getParentOrThrow();
  }
  return predicate(parent) ? parent : null;
}

function insertRangeAfter(
  node: LexicalNode,
  firstToInsert: LexicalNode,
  lastToInsert?: LexicalNode,
) {
  const lastToInsert2 =
    lastToInsert || firstToInsert.getParentOrThrow().getLastChild()!;
  let current = firstToInsert;
  const nodesToInsert = [firstToInsert];
  while (current !== lastToInsert2) {
    current = current.getNextSibling()!;
    nodesToInsert.push(current);
  }

  let currentNode: LexicalNode = node;
  for (const nodeToInsert of nodesToInsert) {
    currentNode = currentNode.insertAfter(nodeToInsert);
  }
}

// modified from LexicalSelection

function appendNodes(parent: ElementNode, nodes: Array<LexicalNode>): void {
  if (nodes.length === 0) {
    return;
  }

  const firstBlock = parent;
  const last = nodes[nodes.length - 1]!;

  // CASE 1: insert inside a code block
  if ("__language" in firstBlock && $isElementNode(firstBlock)) {
    // copy original code back in and figure out how to make it work
    // without a selection
    console.error("inserting in CodeBlocks not supported");
  }

  // CASE 2: All elements of the array are inline
  const notInline = (node: LexicalNode) =>
    ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline();

  if (!nodes.some(notInline)) {
    firstBlock.append(...nodes);
    return;
  }

  // CASE 3: At least 1 element of the array is not inline
  const blocksParent = $wrapInlineNodes(nodes);
  const lastDescendant = blocksParent.getLastDescendant()!;
  const blocks = blocksParent.getChildren();
  const isLI = (node: LexicalNode) => "__value" in node && "__checked" in node;
  const isMergeable = (node: LexicalNode): node is ElementNode =>
    $isElementNode(node) &&
    INTERNAL_$isBlock(node) &&
    !node.isEmpty() &&
    $isElementNode(firstBlock) &&
    (!firstBlock.isEmpty() || isLI(firstBlock));

  const shouldInsert = !$isElementNode(firstBlock) || !firstBlock.isEmpty();
  let insertedParagraph: ParagraphNode | undefined = undefined;
  if (shouldInsert) {
    insertedParagraph = $createParagraphNode();
    firstBlock.append(insertedParagraph);
  }
  const lastToInsert = blocks[blocks.length - 1];
  let firstToInsert = blocks[0];
  if (isMergeable(firstToInsert)) {
    firstBlock.append(...firstToInsert.getChildren());
    firstToInsert = blocks[1];
  }
  if (firstToInsert) {
    console.log("firstToInsert", firstToInsert);
    insertRangeAfter(firstBlock, firstToInsert);
  }
  const lastInsertedBlock = $getAncestor(lastDescendant, INTERNAL_$isBlock)!;

  if (
    insertedParagraph &&
    $isElementNode(lastInsertedBlock) &&
    (isLI(insertedParagraph) || INTERNAL_$isBlock(lastToInsert))
  ) {
    lastInsertedBlock.append(...insertedParagraph.getChildren());
    insertedParagraph.remove();
  }
  if ($isElementNode(firstBlock) && firstBlock.isEmpty()) {
    firstBlock.remove();
  }

  // To understand this take a look at the test "can wrap post-linebreak nodes into new element"
  const lastChild = $isElementNode(firstBlock)
    ? firstBlock.getLastChild()
    : null;
  if ($isLineBreakNode(lastChild) && lastInsertedBlock !== firstBlock) {
    lastChild.remove();
  }
}

function $wrapInlineNodes(nodes: LexicalNode[]) {
  // We temporarily insert the topLevelNodes into an arbitrary ElementNode,
  // since insertAfter does not work on nodes that have no parent (TO-DO: fix that).
  const virtualRoot = $createParagraphNode();

  let currentBlock = null;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    const isLineBreakNode = $isLineBreakNode(node);

    if (
      isLineBreakNode ||
      ($isDecoratorNode(node) && node.isInline()) ||
      ($isElementNode(node) && node.isInline()) ||
      $isTextNode(node) ||
      node.isParentRequired()
    ) {
      if (currentBlock === null) {
        currentBlock = node.createParentElementNode();
        virtualRoot.append(currentBlock);
        // In the case of LineBreakNode, we just need to
        // add an empty ParagraphNode to the topLevelBlocks.
        if (isLineBreakNode) {
          continue;
        }
      }

      if (currentBlock !== null) {
        currentBlock.append(node);
      }
    } else {
      virtualRoot.append(node);
      currentBlock = null;
    }
  }

  return virtualRoot;
}

export function $appendNodes(parent: ElementNode, serializedNodes: BaseSerializedNode[]) {
  console.log("what we're giving", serializedNodes);
  const nodes = $generateNodesFromSerializedNodes(serializedNodes);
  console.log("here's what we got", nodes);
  parent.append(...nodes);
}
