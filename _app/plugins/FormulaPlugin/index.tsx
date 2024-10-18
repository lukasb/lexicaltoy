import { useEffect, useState, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { 
  FormulaEditorNode,
  FormulaDisplayNode,
} from "@/_app/nodes/FormulaNode";
import {
  NodeElementMarkdown,
  BaseNodeMarkdown
} from "@/lib/formula/formula-definitions";
import { useSharedNodeContext } from "../../context/shared-node-context";
import { registerFormulaCommandHandlers } from "./formula-command-handlers";
import { registerFormulaMutationListeners } from "./formula-mutation-listeners";

export type ChildSharedNodeReference = {
  parentLexicalNodeKey: string;
  baseNodeMarkdown: BaseNodeMarkdown
}

export function FormulaPlugin(): null {

  const [editor] = useLexicalComposerContext();

  // maps from ListItemNode keys to NodeElementMarkdown
  // these are the "main" shared nodes - that appear right below the wikilinks
  const [localSharedNodeMap, setLocalSharedNodeMap] = useState(new Map<string, NodeElementMarkdown>());

  // maps from ListItemNode keys to ChildSharedNodeReference
  // these are the children of the main shared nodes
  // AND this includes the main shared nodes themselves
  const [localChildNodeMap, setLocalChildNodeMap] = useState(new Map<string, ChildSharedNodeReference>());
  
  const { sharedNodeMap: globalSharedNodeMap, setSharedNodeMap, updateNodeMarkdown } = useSharedNodeContext();
  const updatingNodeKey = useRef<string | null>(null);

  const setUpdatingNodeKey = (key: string | null) => {
    updatingNodeKey.current = key;
  };

  useEffect(() => {
    if (!editor.hasNodes([FormulaEditorNode, FormulaDisplayNode])) {
      throw new Error('FormulaPlugin: FormulaEditorNode and/or FormulaDisplayNode not registered on editor');
    }
    console.log("registerFormulaCommandHandlers");
    return registerFormulaCommandHandlers(
      editor, updatingNodeKey, setUpdatingNodeKey, setLocalSharedNodeMap, setLocalChildNodeMap);
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
    return registerFormulaMutationListeners(
      editor, localSharedNodeMap, localChildNodeMap, updateNodeMarkdown, setUpdatingNodeKey);
  }, [editor, localSharedNodeMap, localChildNodeMap, updateNodeMarkdown]);

  return null;
}