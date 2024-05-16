import { 
  FormulaEditorNode,
  FormulaDisplayNode,
  $isFormulaDisplayNode,
  $createFormulaDisplayNode,
  $createFormulaEditorNode
} from "@/app/nodes/FormulaNode";
import { 
  LexicalEditor,
  LexicalNode,
  $getNodeByKey,
  $isTextNode,
} from "lexical";
import {
  ListItemNode,
  $isListItemNode,
  ListNode,
  $isListNode
} from "@lexical/list";
import { 
  getListItemParentNode,
  $addChildListItem,
  $deleteChildrenFromListItem,
} from "@/app/lib/list-utils";
import { parseFormulaMarkdown } from "../../lib/formula/formula-markdown-converters";
import { NodeMarkdown } from "../../lib/formula/formula-definitions";
import { $isWikilinkNode, WikilinkNode } from "@/app/nodes/WikilinkNode";
import { 
  $createFormattableTextNode,
  FormattableTextNode
} from "@/app/nodes/FormattableTextNode";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { ChildSharedNodeReference } from ".";

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
  setLocalSharedNodeMap: React.Dispatch<React.SetStateAction<Map<string, NodeMarkdown>>>,
  setLocalChildNodeMap: React.Dispatch<React.SetStateAction<Map<string, ChildSharedNodeReference>>>
) {

  const parentListItem = getListItemParentNode(displayNode);
  if (!parentListItem) return;

  // currently we only suppor showing results that are list items
  const listItemRegex = /^(\s*)-\s*(.+)$/;
  const sortedNodes = sortNodeMarkdownByPageName(nodesMarkdown);

  // prevent this editor from stealing focus
  // we make it editable again in an update listener in PageListenerPlugin
  editor.setEditable(false);

  // TODO maybe warn the user that any existing children will be deleted?
  $deleteFormulaDisplayNodeChildren(displayNode);

  let currentPageName = "";
  let currentPageListItem: ListItemNode | null = null;

  for (const node of sortedNodes) {
    const lines = node.nodeMarkdown.split("\n");
    const match = lines[0].match(listItemRegex);
    if (!match) continue;

    if (node.pageName !== currentPageName) {
      currentPageName = node.pageName;
      const pageNameListItem = new ListItemNode();
      pageNameListItem.append($createFormattableTextNode("[[" + currentPageName + "]]"));
      $addChildListItem(parentListItem, false, false, pageNameListItem);
      currentPageListItem = pageNameListItem;
    }

    if (currentPageListItem) {
      const listItemNode = new ListItemNode();
      $convertFromMarkdownString(match[2], TRANSFORMERS, listItemNode);
      $addChildListItem(currentPageListItem, false, false, listItemNode);

      setLocalSharedNodeMap((prevMap) => {
        const updatedMap = new Map(prevMap);
        updatedMap.set(listItemNode.getKey(), node);
        return updatedMap;
      });

      // if the list item has children/grandchildren etc, add them
      // number of spaces before the dash determines the indent level (not 1:1 mapping)
      let indent = match[1].length;
      let lastPeer = listItemNode;
      let parents = [];
      let leaves = [listItemNode];
      for (let i = 1; i < lines.length; i++) {
        const childListItem = new ListItemNode();
        const childMatch = lines[i].match(listItemRegex);
        if (childMatch) {
          $convertFromMarkdownString(childMatch[2], TRANSFORMERS, childListItem);
          if (childMatch[1].length > indent) {
            parents.push(lastPeer);
            indent = childMatch[1].length;
          } else if (childMatch[1].length < indent) {
            parents.pop();
            indent = childMatch[1].length;
          }
          const parent = parents[parents.length - 1];
          $addChildListItem(parent, false, false, childListItem);
          lastPeer = childListItem;
          leaves.push(childListItem);
        }
      }

      // make sure we can map any children/grandchildren back to the global shared node map
      setLocalChildNodeMap((prevMap) => {
        const updatedMap = new Map(prevMap);
        for (let i = 0; i < leaves.length; i++) {
          updatedMap.set(leaves[i].getKey(), {
            parentLexicalNodeKey: listItemNode.getKey(),
            childLineNumWithinParent: i
          });
        }
        return updatedMap;
      });
 
    }
  }

}