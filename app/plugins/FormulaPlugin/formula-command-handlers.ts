import { MutableRefObject } from "react";
import { 
  FormulaEditorNode,
  FormulaDisplayNode,
  $isFormulaDisplayNode,
  $createFormulaDisplayNode,
} from "@/app/nodes/FormulaNode";
import { 
  LexicalEditor,
  TextNode,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  $isNodeSelection,
  KEY_BACKSPACE_COMMAND,
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
import {
  $replaceWithFormulaDisplayNode,
  createFormulaOutputNodes,
  haveExistingFormulaEditorNode,
  replaceExistingFormulaEditorNode,
  $replaceDisplayNodeWithEditor,
  $replaceTextNodeWithEditor,
  $replaceEditorWithTextNode,
  getFormulaEditorNodeKey
} from "./formula-node-helpers"

export function registerFormulaCommandHandlers(
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