import { useEffect, useState, useRef, MutableRefObject } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  FormulaEditorNode,
  FormulaDisplayNode,
  $isFormulaDisplayNode,
  $createFormulaDisplayNode,
} from "@/app/nodes/FormulaNode";
import { 
  LexicalEditor,
  TextNode,
  ElementNode,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  $isNodeSelection,
  $isTextNode
} from "lexical";
import {
  ListItemNode,
  $isListItemNode,
} from "@lexical/list";
import { mergeRegister } from "@lexical/utils";
import { 
  $getActiveListItemFromSelection,
} from "@/app/lib/list-utils";
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT,
  CREATE_FORMULA_NODES
} from "../../lib/formula-commands";
import { parseFormulaMarkdown } from "../../lib/formula/formula-markdown-converters";
import { NodeMarkdown } from "../../lib/formula/formula-definitions";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { useSharedNodeContext } from "../../context/shared-node-context";
import {
  $getFormulaNodeFromSharedNode,
  $replaceWithFormulaDisplayNode,
  createFormulaOutputNodes,
  $getContainingListItemNode,
  haveExistingFormulaEditorNode,
  replaceExistingFormulaEditorNode,
  $replaceDisplayNodeWithEditor,
  $replaceTextNodeWithEditor,
  $replaceEditorWithTextNode,
  getFormulaEditorNodeKey
} from "./formula-node-helpers"

function registerFormulaHandlers(
  editor: LexicalEditor,
  updatingNodeKey: MutableRefObject<string | null>,
  setUpdatingNodeKey: (updatingNodeKey: string | null) => void,
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
          $replaceTextNodeWithEditor(node);
        }
      }),
      editor.registerNodeTransform(FormulaEditorNode, (node) => {
        // this logic is mostly around making sure if we serialize a FormulaEditorNode
        // that it is turned back into a FormulaDisplayNode when the editor is reloaded
        // TODO maybe handle this in FormulaEditorNode.importJSON instead?
        const textContents = node.getTextContent();
        if (!textContents.startsWith("=")) {
          $replaceEditorWithTextNode(node);
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
              node.getKey() !== getFormulaEditorNodeKey()
            ) {
              replaceExistingFormulaEditorNode();
            }
            if ($isFormulaDisplayNode(node)) {
              $replaceDisplayNodeWithEditor(node);
            } else if ($isListItemNode(node)) {
              const listItemNode = node;
              if (
                listItemNode?.getChildren()[0] instanceof FormulaDisplayNode
              ) {
                $replaceDisplayNodeWithEditor(
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
            activeNode.getKey() !== getFormulaEditorNodeKey()
          ) {
            replaceExistingFormulaEditorNode();
          }

          const listItemNode = $getActiveListItemFromSelection(selection);
          if (
            listItemNode &&
            listItemNode.getChildren()[0] instanceof FormulaDisplayNode
          ) {
            $replaceDisplayNodeWithEditor(
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
            $replaceDisplayNodeWithEditor(displayNode);
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

          // don't recreate the nodes if the given display node is the source of the update
          if (displayNodeKey === updatingNodeKey.current) {
            setUpdatingNodeKey(null);
            return true;
          }
          const displayNode = $getNodeByKey(displayNodeKey);
          if (displayNode && $isFormulaDisplayNode(displayNode)) {
            createFormulaOutputNodes(
              editor,
              displayNode,
              nodesMarkdown,
              setLocalSharedNodeMap
            );
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerUpdateListener(({editorState}) => {
        if (editor.isEditable()) return;
        editor.update(() => {
          editor.setEditable(true);
        });
      })
    );
  }

  function registerFormulaMutationListeners(
    editor: LexicalEditor,
    localSharedNodeMap: Map<string, NodeMarkdown>,
    updateNodeMarkdownGlobal: (updatedNodeMarkdown: NodeMarkdown, needsSyncToPage: boolean) => void,
    setUpdatingNodeKey: (updatingNodeKey: string | null) => void,
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

                    const formulaDisplayNode = $getFormulaNodeFromSharedNode(listItem);
                    setUpdatingNodeKey(formulaDisplayNode?.getKey() ?? null);

                    localSharedNodeMap.set(listItemKey, {
                      pageName: oldNodeMarkdown.pageName,
                      lineNumber: oldNodeMarkdown.lineNumber,
                      nodeMarkdown: updatedNodeMarkdown,
                    });
                    updateNodeMarkdownGlobal(
                      { ...oldNodeMarkdown, nodeMarkdown: updatedNodeMarkdown },
                      true // set needsSyncToPage to true
                    );
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
  const updatingNodeKey = useRef<string | null>(null);

  const setUpdatingNodeKey = (key: string | null) => {
    updatingNodeKey.current = key;
  };

  useEffect(() => {
    if (!editor.hasNodes([FormulaEditorNode, FormulaDisplayNode])) {
      throw new Error('FormulaPlugin: FormulaEditorNode and/or FormulaDisplayNode not registered on editor');
    }
    return registerFormulaHandlers(editor, updatingNodeKey, setUpdatingNodeKey, setLocalSharedNodeMap);
  }, [editor, setLocalSharedNodeMap, updatingNodeKey]);

  // we register commands in two different places because if we registered the command listeners in the 
  // same useEffect as the mutation listeners (which are dependent on updateNodeMarkdown), we would get a
  // race condition where a change to the global shared node map would update updateNodeMarkdown, causing
  // the command listeners to be re-registered at the same time FormulaDisplayComponent is trying to 
  // dispatch CREATE_FORMULA_NODES to render the updated nodes ... but the command would be dropped

  useEffect(() => {
    if (!editor.hasNodes([FormulaEditorNode, FormulaDisplayNode])) {
      throw new Error('FormulaPlugin: FormulaEditorNode and/or FormulaDisplayNode not registered on editor');
    }
    return registerFormulaMutationListeners(editor, localSharedNodeMap, updateNodeMarkdown, setUpdatingNodeKey);
  }, [editor, localSharedNodeMap, updateNodeMarkdown]);

  return null;
}