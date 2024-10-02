import { 
  FormulaEditorNode,
  FormulaDisplayNode,
  $isFormulaDisplayNode,
  $createFormulaDisplayNode,
  $createFormulaEditorNode
} from "@/_app/nodes/FormulaNode";
import { 
  LexicalEditor,
  LexicalNode,
  $getNodeByKey,
  $isTextNode,
  RootNode,
  ParagraphNode,
  $createParagraphNode,
} from "lexical";
import {
  ListItemNode,
  $isListItemNode,
  ListNode,
  $isListNode,
  $createListItemNode,
  SerializedListItemNode,
  SerializedListNode
} from "@lexical/list";
import { 
  getListItemParentNode,
  $addChildListItem,
  $deleteChildrenFromListItem,
  $getListContainingChildren,
  $getOrAddListContainingChildren,
} from "@/lib/list-utils";
import { parseFormulaMarkdown } from "@/lib/formula/formula-markdown-converters";
import { BaseNodeMarkdown, NodeElementMarkdown } from "@/lib/formula/formula-definitions";
import { $isWikilinkNode, WikilinkNode } from "@/_app/nodes/WikilinkNode";
import { 
  $createFormattableTextNode,
  FormattableTextNode
} from "@/_app/nodes/FormattableTextNode";
import { ChildSharedNodeReference } from ".";
import { $myConvertFromMarkdownString } from "@/lib/markdown/markdown-import";
import { myCreateHeadlessEditor } from "@/lib/editor-utils";
import { $getRoot } from "lexical";
import { $appendNodes, $appendNodesToJSON } from "@/lib/json-helpers";

// if the selection is in a FormulaEditorEditorNode, we track its node key here
// then when selection changes, if it's no longer in this node, we replace it with a FormulaDisplayNode
// TODO maybe this should be a ref?
let __formulaEditorNodeKey = "";

export function getFormulaEditorNodeKey(): string {
  return __formulaEditorNodeKey;
}

export function haveExistingFormulaEditorNode(): boolean {
  return __formulaEditorNodeKey !== "";
}

export function $replaceExistingFormulaEditorNode() {
  const formulaEditorNode = $getNodeByKey(__formulaEditorNodeKey);
  if (formulaEditorNode instanceof FormulaEditorNode) {
    $replaceWithFormulaDisplayNode(formulaEditorNode);
  }
  __formulaEditorNodeKey = "";
}

export function $replaceDisplayNodeWithEditor(node: FormulaDisplayNode) {

  // TODO there's probably a better way
  if (node.getOutput() === "@@childnodes") {
    $deleteFormulaDisplayNodeChildren(node);
  }

  const textSibling = node.getNextSibling();
  if (textSibling && $isTextNode(textSibling)) {
    textSibling.remove();
  }
  const formulaEditorNode = $createFormulaEditorNode(node.getFormula());
  node.replace(formulaEditorNode);
  formulaEditorNode.selectEnd();
  __formulaEditorNodeKey = formulaEditorNode.getKey();
}

export function $replaceTextNodeWithEditor(node: FormattableTextNode) {
  const formulaEditorNode = $createFormulaEditorNode(node.getTextContent());
  node.replace(formulaEditorNode);
  __formulaEditorNodeKey = formulaEditorNode.getKey();
}

export function $replaceEditorWithTextNode(node: FormulaEditorNode) {
  const textNode = $createFormattableTextNode(node.getTextContent());
  node.replace(textNode);
  __formulaEditorNodeKey = "";
}

// get the related FormulaDisplayNode from a shared node assuming our node structure is in place
export function $getFormulaNodeFromSharedNode(listItemNode: ListItemNode): FormulaDisplayNode | null {
  let currentListItemNode = listItemNode;
  while (currentListItemNode) {
    const parentList = currentListItemNode.getParent();
    if (!parentList || !$isListNode(parentList)) return null;
    const parentListItem = parentList.getParent();
    if (!parentListItem || !$isListItemNode(parentListItem)) return null;
    const prevSibling = parentListItem.getPreviousSibling();
    if (prevSibling && $isListItemNode(prevSibling)) {
      const formulaNode = prevSibling.getChildren()[0];
      if (formulaNode && $isFormulaDisplayNode(formulaNode)) {
        return formulaNode;
      }
    }
    currentListItemNode = parentListItem;
  }
  return null;
}

export function $getWikilinkNodeFromSharedNode(listItemNode: ListItemNode): WikilinkNode | null {
  if (!listItemNode) return null;
  const parentList = listItemNode.getParent() as ListNode;
  if (!parentList) return null;
  const parentListItem = parentList.getParent() as ListItemNode;
  if (!parentListItem) return null;
  const prevSibling = parentListItem.getPreviousSibling() as ListItemNode;
  if (!prevSibling) return null;
  const wikilinkNode = prevSibling.getChildren()[0];
  if (wikilinkNode && $isWikilinkNode(wikilinkNode)) {
    return wikilinkNode;
  }
  return null;
}

export function $getFormulaDisplayNodeFromWikilinkNode(listItemNode: ListItemNode): FormulaDisplayNode | null {
  const parentList = listItemNode.getParent() as ListNode;
  if (!parentList) return null;
  const parentListItem = parentList.getParent() as ListItemNode;
  if (!parentListItem) return null;
  const prevSibling = parentListItem.getPreviousSibling() as ListItemNode;
  if (!prevSibling) return null;
  const displayNode = prevSibling.getChildren()[0];
  if (displayNode && $isFormulaDisplayNode(displayNode)) {
    return displayNode;
  }
  return null;
}

export function $getContainingListItemNode(node: LexicalNode): ListItemNode | null {
  if (!node) return null;
  let parent = node.getParent();
  while (parent && !$isListItemNode(parent)) {
    parent = parent.getParent();
  }
  return parent;
}

export function $deleteFormulaDisplayNodeChildren(node: FormulaDisplayNode) {
  const parent = $getContainingListItemNode(node);
  if (parent) {
    const listItem = parent as ListItemNode;
    $deleteChildrenFromListItem(listItem);
  } else {
    console.error("$deleteFormulaDisplayNodeChildren: node has no parent");
  }
}

export function $replaceWithFormulaDisplayNode(node: FormulaEditorNode) {
  const textContents = node.getTextContent();
  const { formula: formulaText, result: resultString } = parseFormulaMarkdown(textContents);
  if (!formulaText) return;
  let formulaDisplayNode = null;
  if (resultString) {
    formulaDisplayNode = $createFormulaDisplayNode(formulaText, resultString);
  } else {
    formulaDisplayNode = $createFormulaDisplayNode(formulaText);
  }
  node.replace(formulaDisplayNode);
}

function sortNodeMarkdownByPageName(nodes: NodeElementMarkdown[]): NodeElementMarkdown[] {
  return nodes.slice().sort((a, b) => a.baseNode.pageName.localeCompare(b.baseNode.pageName));
}

// currently we only support showing results that are list items
const listItemRegex = /^(\s*)(-\s*.+(?:\n(?!\s*-).*)*)/;

type SerializedListItemWithMarkdown = {
  serializedNode: SerializedListItemNode;
  baseNodeMarkdown: BaseNodeMarkdown;
  children: SerializedListItemWithMarkdown[];
};

function addChildren(
  headlessEditor: LexicalEditor,
  parentListItem: ListItemNode,
  children: NodeElementMarkdown[]
): Array<{ key: string; baseNodeMarkdown: BaseNodeMarkdown }> {
  let serializedNodes: SerializedListItemWithMarkdown[] = [];
  headlessEditor.update(() => {
    serializedNodes = _buildSerializedTree(headlessEditor, children);
  });
  return addChildrenRecursively(parentListItem, serializedNodes);
}

function _buildSerializedTree(
  headlessEditor: LexicalEditor,
  children: NodeElementMarkdown[]
): SerializedListItemWithMarkdown[] {
  let addedNodes: SerializedListItemWithMarkdown[] = [];

  children.forEach((child) => {
    const root = $getRoot();
    const childMatch = child.baseNode.nodeMarkdown.match(listItemRegex);
    if (childMatch) {
      $myConvertFromMarkdownString(childMatch[2], false, root);
      const listNode = root.getFirstChild() as ListNode;
      if (listNode) {
        const listItemNode = listNode.getFirstChild() as ListItemNode;
        if (listItemNode) {
          let serializedLIs: SerializedListItemNode[] = [];
          $appendNodesToJSON(headlessEditor, listItemNode, serializedLIs);
          // Recursively add grandchildren
          let nodeChildren: SerializedListItemWithMarkdown[] = [];
          if (child.children && child.children.length > 0) {
            nodeChildren = _buildSerializedTree(headlessEditor, child.children);
          }
          addedNodes.push({
            serializedNode: serializedLIs[0],
            baseNodeMarkdown: child.baseNode,
            children: nodeChildren
          });
        }
      }
    }
  });

  return addedNodes;
}

function addChildrenRecursively(
  parentListItem: ListItemNode,
  children: SerializedListItemWithMarkdown[]
): Array<{ key: string; baseNodeMarkdown: BaseNodeMarkdown }> {
  let addedNodes: Array<{ key: string; baseNodeMarkdown: BaseNodeMarkdown }> =
    [];

  if (!children.length) return [];

  const childrenList = $getOrAddListContainingChildren(parentListItem);
  children.forEach((child) => {
    $appendNodes(childrenList, [child.serializedNode]);
    const childListItem = childrenList.getLastChild() as ListItemNode;
    addedNodes.push({
      key: childListItem.getKey(),
      baseNodeMarkdown: child.baseNodeMarkdown,
    });

    // Recursively add grandchildren
    if (child.children && child.children.length > 0) {
      addedNodes = addedNodes.concat(
        addChildrenRecursively(childListItem, child.children)
      );
    }
    
  });

  return addedNodes;
}

export function createFormulaOutputNodes(
  editor: LexicalEditor,
  displayNode: FormulaDisplayNode,
  nodesMarkdown: NodeElementMarkdown[],
  setLocalSharedNodeMap: React.Dispatch<React.SetStateAction<Map<string, NodeElementMarkdown>>>,
  setLocalChildNodeMap: React.Dispatch<React.SetStateAction<Map<string, ChildSharedNodeReference>>>
) {

  const parentListItem = getListItemParentNode(displayNode);
  if (!parentListItem) return;

  const sortedNodes = sortNodeMarkdownByPageName(nodesMarkdown);
  
  // prevent this editor from stealing focus
  // we make it editable again in an update listener in PageListenerPlugin
  if (
    !editor.isComposing() &&
    editor.getRootElement() !== document.activeElement
  ) {
    editor.setEditable(false);
  }

  // TODO maybe warn the user that any existing children will be deleted?
  $deleteFormulaDisplayNodeChildren(displayNode);

  let currentPageName = "";
  let currentPageListItem: ListItemNode | null = null;
  let currentPageList: ListNode | null = null;

  const headlessEditor = myCreateHeadlessEditor();

  for (const node of sortedNodes) {
    const match = node.baseNode.nodeMarkdown.match(listItemRegex);
    if (!match) continue;

    if (node.baseNode.pageName !== currentPageName) {
      currentPageName = node.baseNode.pageName;
      const pageNameListItem = new ListItemNode();
      pageNameListItem.append(
        $createFormattableTextNode("[[" + currentPageName + "]]")
      );
      $addChildListItem(parentListItem, false, false, pageNameListItem);
      currentPageListItem = pageNameListItem;
      currentPageList = $getOrAddListContainingChildren(currentPageListItem);
    }

    if (currentPageListItem && currentPageList) {

      let serializedNode: SerializedListItemNode[] = [];
      headlessEditor.update(() => {
        const headlessRoot = $getRoot();
        $myConvertFromMarkdownString(match[2], false, headlessRoot);
        const listNode = headlessRoot.getFirstChild() as ListNode;
        if (listNode) {
          const listItemNode = listNode.getFirstChild() as ListItemNode;
          if (listItemNode) {
            $appendNodesToJSON(headlessEditor, listItemNode, serializedNode);
          }
        }
      });

      if (serializedNode) {
        $appendNodes(currentPageList, serializedNode);
        const listItemNode = currentPageList.getLastChild() as ListItemNode;
        
        setLocalSharedNodeMap((prevMap) => {
          const updatedMap = new Map(prevMap);
          updatedMap.set(listItemNode.getKey(), node);
          return updatedMap;
        });

        const addedChildNodes = addChildren(
          headlessEditor,
          listItemNode,
          node.children
        );

        addedChildNodes.unshift(
          {
            key: listItemNode.getKey(),
            baseNodeMarkdown: node.baseNode
          });
    
        // make sure we can map any children/grandchildren back to the global shared node map
        setLocalChildNodeMap((prevMap) => {
          const updatedMap = new Map(prevMap);
          addedChildNodes.forEach((childNode) => {
            updatedMap.set(childNode.key, {
              parentLexicalNodeKey: listItemNode.getKey(),
              baseNodeMarkdown: childNode.baseNodeMarkdown,
            });
          });
          return updatedMap;
        });
      }
    }
  }
}

function findWikilinkListItemByPageName(
  editor: LexicalEditor,
  displayNode: FormulaDisplayNode,
  pageName: string
): ListItemNode | null {
  const parentListItem = $getContainingListItemNode(displayNode);
  if (!parentListItem) return null;
  const wikilinkList = $getListContainingChildren(parentListItem);
  if (!wikilinkList) return null;
  for (const child of wikilinkList.getChildren()) {
    if ($isListItemNode(child) && child.getTextContent() === "[[" + pageName + "]]") {
      return child;
    }
  }
  return null;
}

// this is used when we already have formula output nodes, but we need to add more
export function addFormulaOutputNodes(
  editor: LexicalEditor,
  displayNode: FormulaDisplayNode,
  nodesMarkdown: NodeElementMarkdown[],
  setLocalSharedNodeMap: React.Dispatch<React.SetStateAction<Map<string, NodeElementMarkdown>>>,
  setLocalChildNodeMap: React.Dispatch<React.SetStateAction<Map<string, ChildSharedNodeReference>>>
) {

  const parentListItem = getListItemParentNode(displayNode);
  if (!parentListItem) return;

  const sortedNodes = sortNodeMarkdownByPageName(nodesMarkdown);
  
  // prevent this editor from stealing focus if it doesn't already have it
  // we make it editable again in an update listener in PageListenerPlugin
  if (
    !editor.isComposing() &&
    editor.getRootElement() !== document.activeElement
  ) {
    editor.setEditable(false);
  }

  let currentPageName = "";
  let currentPageListItem: ListItemNode | null = null;
  let currentPageList: ListNode | null = null;

  // two cases to handle
  // 1. nodes that should be added to existing wikilinks
  // 2. nodes that need a new wikilink added

  const headlessEditor = myCreateHeadlessEditor();

  for (const node of sortedNodes) {
    const match = node.baseNode.nodeMarkdown.match(listItemRegex);
    if (!match) continue;

    if (node.baseNode.pageName !== currentPageName) {
      currentPageName = node.baseNode.pageName;
      let pageNameListItem: ListItemNode | null = findWikilinkListItemByPageName(editor, displayNode, currentPageName);
      if (!pageNameListItem) {
        pageNameListItem = new ListItemNode();
        pageNameListItem.append(
          $createFormattableTextNode("[[" + currentPageName + "]]")
        );  
        $addChildListItem(parentListItem, false, false, pageNameListItem);
      }
      currentPageListItem = pageNameListItem;
      currentPageList = $getOrAddListContainingChildren(currentPageListItem);
    }

    if (currentPageListItem && currentPageList) {

      let serializedNode: SerializedListItemNode[] = [];
      headlessEditor.update(() => {
        const headlessRoot = $getRoot();
        $myConvertFromMarkdownString(match[2], false, headlessRoot);
        const listNode = headlessRoot.getFirstChild() as ListNode;
        if (listNode) {
          const listItemNode = listNode.getFirstChild() as ListItemNode;
          if (listItemNode) {
            $appendNodesToJSON(headlessEditor, listItemNode, serializedNode);
          }
        }
      });

      if (serializedNode) {
        $appendNodes(currentPageList, serializedNode);
        const listItemNode = currentPageList.getLastChild() as ListItemNode;
        
        setLocalSharedNodeMap((prevMap) => {
          const updatedMap = new Map(prevMap);
          updatedMap.set(listItemNode.getKey(), node);
          return updatedMap;
        });

        const addedChildNodes = addChildren(
          headlessEditor,
          listItemNode,
          node.children
        );

        addedChildNodes.unshift(
          {
            key: listItemNode.getKey(),
            baseNodeMarkdown: node.baseNode
          });
    
        // make sure we can map any children/grandchildren back to the global shared node map
        setLocalChildNodeMap((prevMap) => {
          const updatedMap = new Map(prevMap);
          addedChildNodes.forEach((childNode) => {
            updatedMap.set(childNode.key, {
              parentLexicalNodeKey: listItemNode.getKey(),
              baseNodeMarkdown: childNode.baseNodeMarkdown,
            });
          });
          return updatedMap;
        });
      }
    }
  }
}