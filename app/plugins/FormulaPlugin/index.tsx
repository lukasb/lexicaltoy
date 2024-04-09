import { useEffect, useState, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  FormulaEditorNode,
  FormulaDisplayNode,
} from "@/app/nodes/FormulaNode";
import { NodeMarkdown } from "../../lib/formula/formula-definitions";
import { useSharedNodeContext } from "../../context/shared-node-context";
import { registerFormulaCommandHandlers } from "./formula-command-handlers";
import { registerFormulaMutationListeners } from "./formula-mutation-listeners";

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
    return registerFormulaCommandHandlers(editor, updatingNodeKey, setUpdatingNodeKey, setLocalSharedNodeMap);
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