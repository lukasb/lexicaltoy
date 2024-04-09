import { 
  FormulaEditorNode,
  FormulaDisplayNode,
  $isFormulaDisplayNode,
  $createFormulaDisplayNode,
  $createFormulaEditorNode
} from "@/app/nodes/FormulaNode";
import { 
  LexicalEditor,
  TextNode,
  LexicalNode,
  $getNodeByKey,
  $isTextNode,
  $getSelection,
  $isRangeSelection
} from "lexical";
import {
  ListItemNode,
  $isListItemNode,
  ListNode
} from "@lexical/list";
import { 
  getListItemParentNode,
  $addChildListItem,
  $deleteChildrenFromListItem,
} from "@/app/lib/list-utils";
import { parseFormulaMarkdown } from "../../lib/formula/formula-markdown-converters";
import { NodeMarkdown } from "../../lib/formula/formula-definitions";
import { $isWikilinkNode, WikilinkNode } from "@/app/nodes/WikilinkNode";

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

export function replaceExistingFormulaEditorNode() {
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

export function $replaceTextNodeWithEditor(node: TextNode) {
  const formulaEditorNode = $createFormulaEditorNode(node.getTextContent());
  node.replace(formulaEditorNode);
  __formulaEditorNodeKey = formulaEditorNode.getKey();
}

export function $replaceEditorWithTextNode(node: FormulaEditorNode) {
  const textNode = new TextNode(node.getTextContent());
  node.replace(textNode);
  __formulaEditorNodeKey = "";
}

// get the related FormulaDisplayNode from a shared node assuming our node structure is in place
export function $getFormulaNodeFromSharedNode(listItemNode: ListItemNode): FormulaDisplayNode | null {
  if (!listItemNode) return null;
  const parentList = listItemNode.getParent() as ListNode;
  if (!parentList) return null;
  const parentListItem = parentList.getParent() as ListItemNode;
  if (!parentListItem) return null;
  const grandparentList = parentListItem.getParent() as ListNode;
  if (!grandparentList) return null;
  const grandparentListItem = grandparentList.getParent() as ListItemNode;
  if (!grandparentListItem) return null;
  const prevSibling = grandparentListItem.getPreviousSibling() as ListItemNode;
  if (!prevSibling) return null;
  const formulaNode = prevSibling.getChildren()[0];
  if (formulaNode && $isFormulaDisplayNode(formulaNode)) {
    return formulaNode;
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

export function $getContainingListItemNode(node: LexicalNode): ListItemNode | null {
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

function sortNodeMarkdownByPageName(nodes: NodeMarkdown[]): NodeMarkdown[] {
  return nodes.slice().sort((a, b) => a.pageName.localeCompare(b.pageName));
}

export function createFormulaOutputNodes(
  editor: LexicalEditor,
  displayNode: FormulaDisplayNode,
  nodesMarkdown: NodeMarkdown[],
  setLocalSharedNodeMap: React.Dispatch<React.SetStateAction<Map<string, NodeMarkdown>>>) {

  const parentListItem = getListItemParentNode(displayNode);
  if (!parentListItem) return;

  const listItemRegex = /^\s*-\s*(.+)$/;
  const sortedNodes = sortNodeMarkdownByPageName(nodesMarkdown);

  // prevent this editor from stealing focus
  // we make it editable again in an update listener in formula-command-handlers.ts
  editor.setEditable(false);

  // TODO maybe warn the user that any existing children will be deleted?
  $deleteFormulaDisplayNodeChildren(displayNode);

  let currentPageName = "";
  let currentPageListItem: ListItemNode | null = null;

  for (const node of sortedNodes) {
    const match = node.nodeMarkdown.match(listItemRegex);
    if (match) {
      if (node.pageName !== currentPageName) {
        currentPageName = node.pageName;
        const pageNameListItem = new ListItemNode();
        pageNameListItem.append(new TextNode("[[" + currentPageName + "]]"));
        $addChildListItem(parentListItem, false, false, pageNameListItem);
        currentPageListItem = pageNameListItem;
      }

      if (currentPageListItem) {
        const listItemNode = new ListItemNode();
        listItemNode.append(new TextNode(match[1]));
        $addChildListItem(currentPageListItem, false, false, listItemNode);

        setLocalSharedNodeMap((prevMap) => {
          const updatedMap = new Map(prevMap);
          updatedMap.set(listItemNode.getKey(), node);
          return updatedMap;
        });
      }
    }
  }
}