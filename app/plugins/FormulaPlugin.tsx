import { useEffect, useState, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
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
  ElementNode,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  $isNodeSelection,
  $isTextNode,
  $createTextNode
} from "lexical";
import {
  ListItemNode,
  $isListItemNode
} from "@lexical/list";
import { mergeRegister } from "@lexical/utils";
import { 
  $getActiveListItemFromSelection,
  getListItemParentNode,
  $addChildListItem,
  $deleteChildrenFromListItem,
} from "@/app/lib/list-utils";
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT,
  CREATE_FORMULA_NODES
} from "../lib/formula-commands";
import { parseFormulaMarkdown } from "../lib/formula/formula-markdown-converters";
import { NodeMarkdown } from "../lib/formula/formula-definitions";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { useSharedNodeContext } from "../context/shared-node-context";

// if the selection is in a FormulaEditorEditorNode, we track its node key here
// then when selection changes, if it's no longer in this node, we replace it with a FormulaDisplayNode
let __formulaEditorNodeKey = "";

function $getContainingListItemNode(node: LexicalNode): ListItemNode | null {
  let parent = node.getParent();
  while (parent && !$isListItemNode(parent)) {
    parent = parent.getParent();
  }
  return parent;
}

function $deleteFormulaDisplayNodeChildren(node: FormulaDisplayNode) {
  const parent = $getContainingListItemNode(node);
  if (parent) {
    const listItem = parent as ListItemNode;
    $deleteChildrenFromListItem(listItem);
  }
}

function $replaceWithFormulaEditorNode(node: FormulaDisplayNode) {

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

function $replaceWithFormulaDisplayNode(node: FormulaEditorNode) {
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
  // For reasons of its own, Lexical inserts a <br> after a DecoratorNode if it's the last child
  // create this dummy node to avoid that
  //const textNode = $createTextNode(" ");
  //formulaDisplayNode.insertAfter(textNode);
}

function haveExistingFormulaEditorNode(): boolean {
  return __formulaEditorNodeKey !== "";
}

function replaceExistingFormulaEditorNode() {
  const formulaEditorNode = $getNodeByKey(__formulaEditorNodeKey);
  if (formulaEditorNode instanceof FormulaEditorNode) {
    $replaceWithFormulaDisplayNode(formulaEditorNode);
  }
  __formulaEditorNodeKey = "";
}

function sortNodeMarkdownByPageName(nodes: NodeMarkdown[]): NodeMarkdown[] {
  return nodes.slice().sort((a, b) => a.pageName.localeCompare(b.pageName));
}

function createFormulaOutputNodes(
  displayNode: FormulaDisplayNode, nodesMarkdown: NodeMarkdown[],
  setLocalSharedNodeMap: React.Dispatch<React.SetStateAction<Map<string, NodeMarkdown>>>) {

  const parentListItem = getListItemParentNode(displayNode);
  if (!parentListItem) return;

  const listItemRegex = /^\s*-\s*(.+)$/;
  const sortedNodes = sortNodeMarkdownByPageName(nodesMarkdown);

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

function registerFormulaHandlers(
  editor: LexicalEditor,
  setLocalSharedNodeMap: React.Dispatch<React.SetStateAction<Map<string, NodeMarkdown>>>
  ) {
    return mergeRegister(
      editor.registerNodeTransform(TextNode, (node) => {
        if (
          !(node.getParent() instanceof ListItemNode) ||
          node.getIndexWithinParent() !== 0 ||
          node instanceof FormulaEditorNode
        ) {
          return;
        }
        const textContents = node.getTextContent();
        const { formula: formulaText, result: resultString } =
          parseFormulaMarkdown(textContents);
        if (formulaText && resultString) {
          const formulaDisplayNode = $createFormulaDisplayNode(
            formulaText,
            resultString
          );
          node.replace(formulaDisplayNode);
        } else if (textContents.startsWith("=")) {
          const formulaEditorNode = new FormulaEditorNode(textContents);
          node.replace(formulaEditorNode);
          __formulaEditorNodeKey = formulaEditorNode.getKey();
        }
      }),
      editor.registerNodeTransform(FormulaEditorNode, (node) => {
        // this logic is mostly around making sure if we serialize a FormulaEditorNode
        // that it is turned back into a FormulaDisplayNode when the editor is reloaded
        // TODO maybe handle this in FormulaEditorNode.importJSON instead?
        const textContents = node.getTextContent();

        if (!textContents.startsWith("=")) {
          const textNode = new TextNode(textContents);
          node.replace(textNode);
          __formulaEditorNodeKey = "";
        } else {
          const selection = $getSelection();
          if (
            selection === null ||
            !$isRangeSelection(selection) ||
            !selection.isCollapsed()
          ) {
            $replaceWithFormulaDisplayNode(node);
          }
          const selectionListItemNode =
            $getActiveListItemFromSelection(selection);
          if (selectionListItemNode) {
            const editorListItemNode = node.getParent();
            if (
              selectionListItemNode.getKey() !== editorListItemNode.getKey()
            ) {
              $replaceWithFormulaDisplayNode(node);
            }
          }
        }
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const selection = $getSelection();
          if (selection === null) return false;

          if ($isNodeSelection(selection)) {
            const node = selection.getNodes()[0];
            if (
              haveExistingFormulaEditorNode() &&
              node.getKey() !== __formulaEditorNodeKey
            ) {
              replaceExistingFormulaEditorNode();
            }
            if ($isFormulaDisplayNode(node)) {
              $replaceWithFormulaEditorNode(node);
            } else if ($isListItemNode(node)) {
              const listItemNode = node;
              if (
                listItemNode?.getChildren()[0] instanceof FormulaDisplayNode
              ) {
                $replaceWithFormulaEditorNode(
                  listItemNode.getChildren()[0] as FormulaDisplayNode
                );
              }
            }
            return false;
          }

          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const activeNode = selection.anchor.getNode();

          if (
            haveExistingFormulaEditorNode() &&
            activeNode.getKey() !== __formulaEditorNodeKey
          ) {
            replaceExistingFormulaEditorNode();
          }

          const listItemNode = $getActiveListItemFromSelection(selection);
          if (
            listItemNode &&
            listItemNode.getChildren()[0] instanceof FormulaDisplayNode
          ) {
            $replaceWithFormulaEditorNode(
              listItemNode.getChildren()[0] as FormulaDisplayNode
            );
          }

          return false;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        SWAP_FORMULA_DISPLAY_FOR_EDITOR,
        ({ displayNodeKey }) => {
          const displayNode = $getNodeByKey(displayNodeKey);
          if (displayNode && $isFormulaDisplayNode(displayNode)) {
            $replaceWithFormulaEditorNode(displayNode);
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        STORE_FORMULA_OUTPUT,
        ({ displayNodeKey, output }) => {
          const displayNode = $getNodeByKey(displayNodeKey);
          if (displayNode && $isFormulaDisplayNode(displayNode)) {
            displayNode.setOutput(output);
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        CREATE_FORMULA_NODES,
        ({ displayNodeKey, nodesMarkdown }) => {
          const displayNode = $getNodeByKey(displayNodeKey);
          if (displayNode && $isFormulaDisplayNode(displayNode)) {
            createFormulaOutputNodes(
              displayNode,
              nodesMarkdown,
              setLocalSharedNodeMap
            );
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      )
    );
  }

  function registerFormulaMutationListeners(
    editor: LexicalEditor,
    localSharedNodeMap: Map<string, NodeMarkdown>,
    updateNodeMarkdownGlobal: (updatedNodeMarkdown: NodeMarkdown) => void
    ) {
      return mergeRegister(
        editor.registerMutationListener(ListItemNode, (mutations) => {
  
          if (localSharedNodeMap.size === 0) return;
  
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              if (key in localSharedNodeMap.keys()) {
                // this doesn't work but the code might be useful later
  
                /*
              if (type === "updated") {
                const node = $getNodeByKey(key);
                const updatedNodeMarkdown = $convertToMarkdownString(
                  TRANSFORMERS,
                  { getChildren: () => [node] } as unknown as ElementNode
                );
                if (updatedNodeMarkdown !== localSharedNodeMap.get(key)?.nodeMarkdown) {
                  const oldNodeMarkdown = localSharedNodeMap.get(key);
                  if (oldNodeMarkdown) {
                    updateNodeMarkdownGlobal({ ...oldNodeMarkdown, nodeMarkdown: updatedNodeMarkdown });
                  }
                }
              }
              */
  
                if (type === "destroyed") {
                  // TODO handle this
                }
              }
            }
          });
        }),
        editor.registerMutationListener(TextNode, (mutations) => {
          
          if (localSharedNodeMap.size === 0) return;
  
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              const node = $getNodeByKey(key);
              if (!node) continue;
  
              const listItem = $getContainingListItemNode(node);
              if (!listItem) continue;
  
              if (localSharedNodeMap.has(listItem.getKey())) {
                             
                const listItemKey = listItem.getKey();
  
                // TODO a better way to normalize node markdown
                const updatedNodeMarkdown = "- " + $convertToMarkdownString(
                  TRANSFORMERS,
                  { getChildren: () => [listItem] } as unknown as ElementNode
                );
  
                if (
                  updatedNodeMarkdown !==
                  localSharedNodeMap.get(listItemKey)?.nodeMarkdown
                ) {
                  const oldNodeMarkdown = localSharedNodeMap.get(listItemKey);
                  if (oldNodeMarkdown) {
                    localSharedNodeMap.set(listItemKey, {
                      pageName: oldNodeMarkdown.pageName,
                      lineNumber: oldNodeMarkdown.lineNumber,
                      nodeMarkdown: updatedNodeMarkdown,
                    });
                    updateNodeMarkdownGlobal({
                      ...oldNodeMarkdown,
                      nodeMarkdown: updatedNodeMarkdown,
                    });
                  }
                }
              }
            }
          });
        })
      );
    }

export function FormulaPlugin(): null {

  const [editor] = useLexicalComposerContext();
  const [localSharedNodeMap, setLocalSharedNodeMap] = useState(new Map<string, NodeMarkdown>());
  const { sharedNodeMap: globalSharedNodeMap, setSharedNodeMap, updateNodeMarkdown } = useSharedNodeContext();

  useEffect(() => {
    if (!editor.hasNodes([FormulaEditorNode, FormulaDisplayNode])) {
      throw new Error('FormulaPlugin: FormulaEditorNode and/or FormulaDisplayNode not registered on editor');
    }
    return registerFormulaHandlers(editor, setLocalSharedNodeMap);
  }, [editor, setLocalSharedNodeMap]);

  // we register commands in two different places because if we registered the command listeners in the 
  // same useEffect as the mutation listeners (which are dependent on updateNodeMarkdown), we would get a
  // race condition where a change to the global shared node map would update updateNodeMarkdown, causing
  // the command listeners to be re-registered at the same time FormulaDisplayComponent is trying to 
  // dispatch CREATE_FORMULA_NODES to render the updated nodes ... but the command would be dropped

  useEffect(() => {
    if (!editor.hasNodes([FormulaEditorNode, FormulaDisplayNode])) {
      throw new Error('FormulaPlugin: FormulaEditorNode and/or FormulaDisplayNode not registered on editor');
    }
    return registerFormulaMutationListeners(editor, localSharedNodeMap, updateNodeMarkdown);
  }, [editor, localSharedNodeMap, updateNodeMarkdown]);

  return null;
}