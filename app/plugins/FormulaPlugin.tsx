import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  FormulaEditorNode,
  FormulaDisplayNode
} from "@/app/nodes/FormulaNode";
import { 
  LexicalEditor,
  TextNode,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey
} from "lexical";
import { ListItemNode } from "@lexical/list";
import { mergeRegister } from "@lexical/utils";
import { $getActiveListItem, $isNodeWithinListItem } from "@/app/lib/list-utils";

let __formulaEditorNodeKey = "";

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
      }
    }),
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if (
          selection === null ||
          !$isRangeSelection(selection) ||
          !selection.isCollapsed()
        ) {
          return false;
        }

        const activeNode = selection.anchor.getNode();

        if (__formulaEditorNodeKey !== "" && activeNode.getKey() !== __formulaEditorNodeKey) {
          const formulaEditorNode = $getNodeByKey(__formulaEditorNodeKey);
          if (formulaEditorNode instanceof FormulaEditorNode) {
            const textContents = formulaEditorNode.getTextContent();
            if (!textContents.startsWith("=")) {
              const textNode = new TextNode(textContents);
              formulaEditorNode.replace(textNode);
            } else {
              const formulaDisplayNode = new FormulaDisplayNode(textContents, "Length of text");
              formulaEditorNode.replace(formulaDisplayNode);
            }
          }
        }

        if (!$isNodeWithinListItem(activeNode)) {
          return false;
        }

        const listItemNode = $getActiveListItem(activeNode);
        if (activeNode instanceof FormulaDisplayNode) {
          const formulaEditorNode = new FormulaEditorNode(activeNode.getFormula());
          activeNode.replace(formulaEditorNode);
          __formulaEditorNodeKey = formulaEditorNode.getKey();
          return false;
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