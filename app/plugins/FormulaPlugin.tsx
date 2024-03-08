import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  FormulaEditorNode,
  FormulaDisplayNode,
  $isFormulaDisplayNode
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
import { $getActiveListItemFromSelection, $isNodeWithinListItem } from "@/app/lib/list-utils";

// if the selection is in a FormulaEditorEditorNode, we track its node key here
// then when selection changes, if it's no longer in this node, we replace it with a FormulaDisplayNode
let __formulaEditorNodeKey = "";

function $replaceWithFormulaEditorNode(node: FormulaDisplayNode) {
  const textSibling = node.getNextSibling();
  if (textSibling && $isTextNode(textSibling)) {
    textSibling.remove();
  }
  const formulaEditorNode = new FormulaEditorNode(node.getFormula());
  node.replace(formulaEditorNode);
  __formulaEditorNodeKey = formulaEditorNode.getKey();
}

function $replaceWithFormulaDisplayNode(node: FormulaEditorNode) {
  const textContents = node.getTextContent();
  const formulaDisplayNode = new FormulaDisplayNode(textContents, "Length of text");
  node.replace(formulaDisplayNode);
  // For reasons of its own, Lexical inserts a <br> after a DecoratorNode if it's the last child - create this dummy node to avoid that
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
      if (textContents.startsWith("=")) {
        const formulaEditorNode = new FormulaEditorNode(textContents);
        node.replace(formulaEditorNode);
        __formulaEditorNodeKey = formulaEditorNode.getKey();
      }
    }),
    editor.registerNodeTransform(FormulaEditorNode, (node) => {
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