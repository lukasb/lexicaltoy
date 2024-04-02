import { useState, useEffect, useCallback, useContext, use } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT,
  CREATE_FORMULA_NODES
} from '@/app/lib/formula-commands';
import { PagesContext } from '../context/pages-context';
import { usePromises } from '../context/formula-request-context';
import { FormulaOutputType, NodeMarkdown } from '../lib/formula/formula-definitions';
import { useSharedNodeContext } from '../context/shared-node-context';
import { useFormulaResultService } from '../page/FormulaResultService';

import './FormulaDisplayComponent.css';

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
  const pages = useContext(PagesContext);
  const { promisesMap, addPromise, removePromise, hasPromise } = usePromises();
  const { sharedNodeMap } = useSharedNodeContext();
  const { getFormulaResults } = useFormulaResultService();
  const [pageLineMarkdownMap, setPageLineMarkdownMap] = useState<Map<string, string>>(new Map<string, string>());

  const getGPTResponse = useCallback(async (prompt: string) => {
    console.log("getGPTResponse", prompt);

    if (!hasPromise(nodeKey)) {
      console.log("no promise");
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
                markdownMap.set(node.pageName + "-" + node.lineNumber.toString(), node.nodeMarkdown);
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
      console.log("getting response...", formula);
      setOutput("(getting response...)");
      getGPTResponse(formula);
    } else if (output === "@@childnodes") {
    
      const sharedNodes: NodeMarkdown[] = [];

      // TODO maybe this should be a different map so we don't have to iterate?
      for (const [key, value] of sharedNodeMap.entries()) {
        if (value.queries.includes(formula)) {
          sharedNodes.push(value.output);
        }
      }

      if (sharedNodes.length > 0) {
        let shouldUpdate = false;
        if (sharedNodes.length !== pageLineMarkdownMap.size) {
          shouldUpdate = true;
        } else {
          for (const node of sharedNodes) {
            if (pageLineMarkdownMap.get(node.pageName + "-" + node.lineNumber.toString())
                !== node.nodeMarkdown
            ) {
              shouldUpdate = true;
              break;
            }
          }
        }

        // the plugin will handle removing our existing nodes before adding the new ones
        if (shouldUpdate) {

          console.log("updating shared nodes...", formula);
          
          const newPageLineMarkdownMap = new Map<string, string>();
          for (const node of sharedNodes) {
            newPageLineMarkdownMap.set(node.pageName + "-" + node.lineNumber.toString(), node.nodeMarkdown);
          }
          setPageLineMarkdownMap(newPageLineMarkdownMap);

          editor.dispatchCommand(CREATE_FORMULA_NODES, {
            displayNodeKey: nodeKey,
            nodesMarkdown: sharedNodes,
          });
        }
      } else {
        // TODO what if there are no results?
      }
    }
  }, [formula, output, sharedNodeMap, editor, nodeKey, getGPTResponse, pageLineMarkdownMap]);

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
