import { useState, useEffect, useCallback, useContext, use } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT,
  CREATE_FORMULA_NODES
} from '@/lib/formula-commands';
import { usePromises } from '../context/formula-request-context';
import { FormulaOutputType, NodeMarkdown } from '@/lib/formula/formula-definitions';
import { useSharedNodeContext, createSharedNodeKey } from '../context/shared-node-context';
import { useFormulaResultService } from '../../lib/formula/FormulaResultService';

export default function FormulaDisplayComponent(
  { formula: initialFormula,
    output: initialOutput,
    nodeKey
  }: 
  {
    formula: string,
    output: string,
    nodeKey: string
  }
): JSX.Element {
  const [formula, setFormula] = useState<string>(initialFormula);
  const [output, setOutput] = useState<string>(initialOutput);
  const [editor] = useLexicalComposerContext();
  const { promisesMap, addPromise, removePromise, hasPromise } = usePromises();
  const { sharedNodeMap } = useSharedNodeContext();
  const { getFormulaResults } = useFormulaResultService();
  const [pageLineMarkdownMap, setPageLineMarkdownMap] = useState<Map<string, string>>(new Map<string, string>());

  const getFormulaOutput = useCallback(async (prompt: string) => {
    if (!hasPromise(nodeKey)) {
      const promise = getFormulaResults(prompt)
        .then(response => {
          if (response) {
            if (response.type === FormulaOutputType.Text) {
              setOutput(response.output as string);
              editor.dispatchCommand(STORE_FORMULA_OUTPUT, {
                displayNodeKey: nodeKey,
                output: response.output as string,
              });
            } else if (response.type === FormulaOutputType.NodeMarkdown) {
              setOutput("@@childnodes");
              // TODO store the nodeMarkdowns locally so we can check when updates happen
              // TODO what if there are no results?
              const markdownMap = new Map<string, string>();
              (response.output as NodeMarkdown[]).forEach(node => {
                markdownMap.set(
                  createSharedNodeKey(node.pageName, node.lineNumberStart, node.lineNumberEnd),
                  node.nodeMarkdown);
              });
              setPageLineMarkdownMap(markdownMap);
              editor.dispatchCommand(CREATE_FORMULA_NODES, {
                displayNodeKey: nodeKey,
                nodesMarkdown: response.output as NodeMarkdown[],
              });
              editor.dispatchCommand(STORE_FORMULA_OUTPUT, {
                displayNodeKey: nodeKey,
                output: "@@childnodes",
              });
            }
            return response;
          } else {
            console.log("no response");
            return null;
          }
        })
        .finally(() => {
          removePromise(nodeKey);
        });
        addPromise(nodeKey, promise);
      }
  }, [addPromise, removePromise, hasPromise, editor, nodeKey, getFormulaResults]);

  useEffect(() => {

    if (output === "") {
      setOutput("(getting response...)");
      getFormulaOutput(formula);
    } else if (output === "@@childnodes") {
      const sharedNodes: NodeMarkdown[] = [];

      console.log("output is @@childnodes");
      // TODO this might be triggered by a change to our own nodes, in which case we don't need to do anything
      // we don't know that here though
      // when we move to Redux, maybe the action should include a node key so we can check

      // TODO maybe this should be a different map so we don't have to iterate?
      for (const [key, value] of sharedNodeMap.entries()) {
        if (value.queries.includes(formula)) {
          sharedNodes.push(value.output);
        }
      }

      let shouldUpdate = false;
      if (sharedNodes.length !== pageLineMarkdownMap.size) {
        shouldUpdate = true;
      } else {
        for (const node of sharedNodes) {
          if (
            pageLineMarkdownMap.get(
              createSharedNodeKey(node.pageName, node.lineNumberStart, node.lineNumberEnd)
            ) !== node.nodeMarkdown
          ) {
            shouldUpdate = true;
            break;
          }
        }
      }

      if (shouldUpdate) {        
        const newPageLineMarkdownMap = new Map<string, string>();
        for (const node of sharedNodes) {
          newPageLineMarkdownMap.set(
            createSharedNodeKey(node.pageName, node.lineNumberStart, node.lineNumberEnd),
            node.nodeMarkdown
          );
        }

        setPageLineMarkdownMap(newPageLineMarkdownMap);

        editor.dispatchCommand(CREATE_FORMULA_NODES, {
          displayNodeKey: nodeKey,
          nodesMarkdown: sharedNodes,
        });
      }
    }
  }, [formula, output, sharedNodeMap, editor, nodeKey, getFormulaOutput, pageLineMarkdownMap]);

  const replaceSelfWithEditorNode = () => {
    // TODO this will create an entry in the undo history which we don't necessarily want
    // maybe do it another way
    editor.dispatchCommand(
      SWAP_FORMULA_DISPLAY_FOR_EDITOR,
      {
        displayNodeKey: nodeKey
      }
    );
  };

  return (
    <div 
      className="inline items-baseline border border-dashed border-red-600"
      onClick={() => replaceSelfWithEditorNode()}
    >
      <span>{formula}: </span>
      {!output.startsWith("@@") && <span>{output}</span>}
    </div>
  );
}
