import { useState, useEffect, useCallback, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT,
  CREATE_FORMULA_NODES,
  ADD_FORMULA_NODES
} from '@/lib/formula-commands';
import { usePromises } from '../context/formula-request-context';
import { FormulaValueType, NodeElementMarkdown, getNodeElementFullMarkdown } from '@/lib/formula/formula-definitions';
import { useSharedNodeContext, createSharedNodeKey } from '../context/shared-node-context';
import { useFormulaResultService } from '../../lib/formula/FormulaResultService';
import { slurpDialogueContext } from '@/lib/formula/FormulaOutput';
import { registerFormula, unregisterFormula } from '../../lib/formula/FormulaResultService';
import { PUT_CURSOR_NEXT_TO_FORMULA_DISPLAY } from '@/lib/formula-commands';

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
  const pageLineMarkdownMapRef = useRef<Map<string, string>>(new Map<string, string>());
  const fetchedNodes = useRef<boolean>(false);

  useEffect(() => {
    registerFormula(formula);
    return () => {
      unregisterFormula(formula);
    }
  }, [formula]);

  const getFormulaOutput = useCallback(async (prompt: string) => {
    if (!hasPromise(nodeKey)) {
      const dialogueContext = slurpDialogueContext(nodeKey, editor);
      const promise = getFormulaResults(prompt, dialogueContext)
        .then(response => {
          if (response) {
            if (response.type === FormulaValueType.Text) {
              setOutput(response.output as string);
              editor.dispatchCommand(STORE_FORMULA_OUTPUT, {
                displayNodeKey: nodeKey,
                output: response.output as string,
              });
            } else if (response.type === FormulaValueType.NodeMarkdown) {
              setOutput("@@childnodes");
              // TODO store the nodeMarkdowns locally so we can check when updates happen
              // TODO what if there are no results?
              const markdownMap = new Map<string, string>();
              (response.output as NodeElementMarkdown[]).forEach(node => {
                markdownMap.set(
                  createSharedNodeKey(node),
                  getNodeElementFullMarkdown(node));
              });
              pageLineMarkdownMapRef.current = markdownMap;
              if (response.output.length > 0) {
                editor.dispatchCommand(CREATE_FORMULA_NODES, {
                  displayNodeKey: nodeKey,
                  nodesMarkdown: response.output as NodeElementMarkdown[],
                });
              }
              editor.dispatchCommand(STORE_FORMULA_OUTPUT, {
                displayNodeKey: nodeKey,
                output: "@@childnodes",
              });
            }
            return response;
          } else {
            setOutput("error processing formula");
            console.log("no response");
            return null;
          }
        })
        .catch(error => {
          console.error("Error in getFormulaResults:", error);
          setOutput("Error occurred while processing formula");
          return null;
        })
        .finally(() => {
          removePromise(nodeKey);
        });
        if (promise) addPromise(nodeKey, promise);
      }
  }, [addPromise, removePromise, hasPromise, editor, nodeKey, getFormulaResults]);

  useEffect(() => {

    if (output === "" || (output === "@@childnodes" && !fetchedNodes.current)) {
      fetchedNodes.current = true;
      if (output === "") setOutput("(getting response...)");
      getFormulaOutput(formula);
    } else if (output === "@@childnodes") {
      const sharedNodes: NodeElementMarkdown[] = [];
    
      // TODO this might be triggered by a change to our own nodes, in which case we don't need to do anything
      // we don't know that here though
      // when we move to Redux, maybe the action should include a node key so we can check

      // TODO maybe this should be a different map so we don't have to iterate?
      for (const [key, value] of sharedNodeMap.entries()) {
        if (value.queries.includes(formula)) {
          sharedNodes.push(value.output);
        }
      }

      let nodeAdded = false;
      let nodeRemoved = false;
      let nodeChanged = false;

      if (sharedNodes.length > pageLineMarkdownMapRef.current.size) {
        nodeAdded = true;
      } else if (sharedNodes.length < pageLineMarkdownMapRef.current.size) {
        nodeRemoved = true;
      } 
      
      for (const node of sharedNodes) {
        if (
          pageLineMarkdownMapRef.current.get(
            createSharedNodeKey(node)
          ) !== getNodeElementFullMarkdown(node)
        ) {
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
        pageLineMarkdownMapRef.current = newPageLineMarkdownMap;
        editor.dispatchCommand(CREATE_FORMULA_NODES, {
          displayNodeKey: nodeKey,
          nodesMarkdown: sharedNodes,
        });
      } else if (nodeAdded) {
        const nodesToAdd: NodeElementMarkdown[] = sharedNodes.filter(node => !pageLineMarkdownMapRef.current.has(createSharedNodeKey(node)));
        editor.dispatchCommand(ADD_FORMULA_NODES, {
          displayNodeKey: nodeKey,
          nodesMarkdown: nodesToAdd,
        });
      }
    }
  }, [formula, output, sharedNodeMap, editor, nodeKey, getFormulaOutput]);

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

  const handleInteractionEnd = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString();

    if (!text) {
      editor.dispatchCommand(PUT_CURSOR_NEXT_TO_FORMULA_DISPLAY, {
        displayNodeKey: nodeKey
      });
    }
  }, [editor, nodeKey]);

  return (
    <div 
      className="inline items-baseline border-l-4 border-formulaBorderColor pl-1 -ml-1"
      style={{ WebkitUserSelect: 'text', userSelect: 'text', WebkitTouchCallout: 'default' }}
      onMouseUp={handleInteractionEnd}
      onTouchEnd={handleInteractionEnd}
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