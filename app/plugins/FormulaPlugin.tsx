import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  FormulaEditorNode,
  FormulaDisplayNode,
  $isFormulaDisplayNode,
  $createFormulaDisplayNode
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
  $isTextNode,
  $createTextNode
} from "lexical";
import {
  ListItemNode,
  $isListItemNode
} from "@lexical/list";
import { mergeRegister } from "@lexical/utils";
import { $getActiveListItemFromSelection } from "@/app/lib/list-utils";
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT
} from "../lib/formula-commands";
import { parseFormulaMarkdown } from "../lib/formula/formula-markdown-converters";

// if the selection is in a FormulaEditorEditorNode, we track its node key here
// then when selection changes, if it's no longer in this node, we replace it with a FormulaDisplayNode
let __formulaEditorNodeKey = "";

function $replaceWithFormulaEditorNode(node: FormulaDisplayNode) {
  const textSibling = node.getNextSibling();
  if (textSibling && $isTextNode(textSibling)) {
    textSibling.remove();
  }
  const prepend = node.getFormula().startsWith("=") ? "" : "="; // TODO yech
  const formulaEditorNode = new FormulaEditorNode(prepend + node.getFormula());
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
    formulaDisplayNode = new FormulaDisplayNode(formulaText, resultString);
  } else {
    formulaDisplayNode = $createFormulaDisplayNode(formulaText);
  }
  node.replace(formulaDisplayNode);
  // For reasons of its own, Lexical inserts a <br> after a DecoratorNode if it's the last child
  // create this dummy node to avoid that
  const textNode = $createTextNode(" ");
  formulaDisplayNode.insertAfter(textNode);
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

function registerFormulaHandlers(editor: LexicalEditor) {
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
      const { formula: formulaText, result: resultString } = parseFormulaMarkdown(textContents);
      if (formulaText && resultString) {
        const formulaDisplayNode = $createFormulaDisplayNode(formulaText, resultString);
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
        if (selection === null || !$isRangeSelection(selection) || !selection.isCollapsed()) {
          $replaceWithFormulaDisplayNode(node);
        }
        const selectionListItemNode = $getActiveListItemFromSelection(selection);
        if (selectionListItemNode) {
          const editorListItemNode = node.getParent();
          if (selectionListItemNode.getKey() !== editorListItemNode.getKey()) {
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
          if (haveExistingFormulaEditorNode() && node.getKey() !== __formulaEditorNodeKey) {
            replaceExistingFormulaEditorNode();
          }
          if ($isFormulaDisplayNode(node)) {
            $replaceWithFormulaEditorNode(node);
          } else if ($isListItemNode(node)) {
            const listItemNode = node;
            if (listItemNode?.getChildren()[0] instanceof FormulaDisplayNode) {
              $replaceWithFormulaEditorNode(listItemNode.getChildren()[0] as FormulaDisplayNode);
            }
          }
          return false;
        }
        
        if (
          !$isRangeSelection(selection) ||
          !selection.isCollapsed()
        ) {
          return false;
        }

        const activeNode = selection.anchor.getNode();

        if (haveExistingFormulaEditorNode() && activeNode.getKey() !== __formulaEditorNodeKey) {
          replaceExistingFormulaEditorNode();
        }

        const listItemNode = $getActiveListItemFromSelection(selection);
        if (listItemNode && listItemNode.getChildren()[0] instanceof FormulaDisplayNode) {
          $replaceWithFormulaEditorNode(listItemNode.getChildren()[0] as FormulaDisplayNode);
        }
      
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
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
    )
  );
}

export function FormulaPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([FormulaEditorNode, FormulaDisplayNode])) {
      throw new Error('FormulaPlugin: FormulaEditorNode and/or FormulaDisplayNode not registered on editor');
    }
    return registerFormulaHandlers(editor);
  }, [editor]);

  return null;
}