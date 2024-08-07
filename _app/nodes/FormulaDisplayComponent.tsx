import { useState, useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT,
  CREATE_FORMULA_NODES,
  ADD_FORMULA_NODES
} from '@/lib/formula-commands';
import { usePromises } from '../context/formula-request-context';
import { FormulaOutputType, NodeElementMarkdown, getNodeElementFullMarkdown } from '@/lib/formula/formula-definitions';
import { useSharedNodeContext, createSharedNodeKey } from '../context/shared-node-context';
import { useFormulaResultService } from '../../lib/formula/FormulaResultService';
import { slurpDialogueContext } from '@/lib/formula/FormulaOutput';

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
      const dialogueContext = slurpDialogueContext(nodeKey, editor);
      const promise = getFormulaResults(prompt, dialogueContext)
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
              (response.output as NodeElementMarkdown[]).forEach(node => {
                markdownMap.set(
                  createSharedNodeKey(node),
                  getNodeElementFullMarkdown(node));
              });
              setPageLineMarkdownMap(markdownMap);
              editor.dispatchCommand(CREATE_FORMULA_NODES, {
                displayNodeKey: nodeKey,
                nodesMarkdown: response.output as NodeElementMarkdown[],
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
      const sharedNodes: NodeElementMarkdown[] = [];
      console.log("shared node map update in FDN", nodeKey);
      // TODO this might be triggered by a change to our own nodes, in which case we don't need to do anything
      // we don't know that here though
      // when we move to Redux, maybe the action should include a node key so we can check

      // TODO maybe this should be a different map so we don't have to iterate?
      for (const [key, value] of sharedNodeMap.entries()) {
        console.log(value.queries, value.output.baseNode.nodeMarkdown, nodeKey);
        if (value.queries.includes(formula)) {
          sharedNodes.push(value.output);
        }
      }

      let nodeAdded = false;
      let nodeRemoved = false;
      let nodeChanged = false;

      if (sharedNodes.length > pageLineMarkdownMap.size) {
        console.log("we have a new node", nodeKey);
        nodeAdded = true;
      } else if (sharedNodes.length < pageLineMarkdownMap.size) {
        nodeRemoved = true;
      } 
      
      for (const node of sharedNodes) {
        if (
          pageLineMarkdownMap.get(
            createSharedNodeKey(node)
          ) !== getNodeElementFullMarkdown(node)
        ) {
          if (nodeAdded) {
             console.log("we have a new node but we also have a changed node", getNodeElementFullMarkdown(node), nodeKey);
          } else {
            console.log("we have a changed node", getNodeElementFullMarkdown(node), nodeKey);
          }
          nodeChanged = true;
          break;
        }
      }

      if (nodeRemoved || nodeChanged) {        
        const newPageLineMarkdownMap = new Map<string, string>();
        for (const node of sharedNodes) {
          newPageLineMarkdownMap.set(
            createSharedNodeKey(node),
            getNodeElementFullMarkdown(node)
          );
        }

        setPageLineMarkdownMap(newPageLineMarkdownMap);
        editor.dispatchCommand(CREATE_FORMULA_NODES, {
          displayNodeKey: nodeKey,
          nodesMarkdown: sharedNodes,
        });
      } else if (nodeAdded) {
        const nodesToAdd: NodeElementMarkdown[] = sharedNodes.filter(node => !pageLineMarkdownMap.has(createSharedNodeKey(node)));
        editor.dispatchCommand(ADD_FORMULA_NODES, {
          displayNodeKey: nodeKey,
          nodesMarkdown: nodesToAdd,
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
      className="inline items-baseline border-l-4 border-formulaBorderColor pl-1 -ml-1"
    >
      <span className="font-semibold bg-bgFormula">{formula}:
        <button className="inline-flex items-center justify-center p-1 text-xs hover:bg-gray-200 rounded" onClick={() => replaceSelfWithEditorNode()}>
          <span role="img" aria-label="Edit" className="transform scale-x-[-1] filter grayscale-[70%]">✏️</span>
        </button>
      </span>
      {!output.startsWith("@@") && <span>{output}</span>}
    </div>
  );
}