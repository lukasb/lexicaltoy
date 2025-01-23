import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT,
  CREATE_FORMULA_NODES,
  ADD_FORMULA_NODES,
  CREATE_AND_STORE_FORMULA_OUTPUT,
  FLATTEN_FORMULA_OUTPUT,
  EDIT_FORMULA_NODE_BLOCK_ID
} from '@/lib/formula-commands';
import { usePromises } from '../context/formula-request-context';
import { FormulaValueType, NodeElementMarkdown, getNodeElementFullMarkdown } from '@/lib/formula/formula-definitions';
import { useSharedNodeContext, createSharedNodeKey } from '../context/shared-node-context';
import { useFormulaResultService } from '../../lib/formula/FormulaResultService';
import { slurpPageAndDialogueContext } from '@/lib/formula/FormulaOutput';
import { registerFormula, unregisterFormula } from '../../lib/formula/FormulaResultService';
import { PUT_CURSOR_NEXT_TO_FORMULA_DISPLAY } from '@/lib/formula-commands';
import { EditDialog } from '../ui/edit-dialog';
import { validateBlockId } from '@/lib/blockref';
import {
  useWhatChanged,
} from '@simbathesailor/use-what-changed';

export default function FormulaDisplayComponent(
  { formula: initialFormula,
    output: initialOutput,
    blockId: initialBlockId,
    nodeKey
  }: 
  {
    formula: string,
    output: string,
    blockId: string,
    nodeKey: string
  }
): JSX.Element {
  const [formula, setFormula] = useState<string>(initialFormula);
  const [output, setOutput] = useState<string>(initialOutput);
  const [blockId, setBlockId] = useState<string>(initialBlockId);
  const [editor] = useLexicalComposerContext();
  const { promisesMap, addPromise, removePromise, hasPromise } = usePromises();
  const { sharedNodeMap } = useSharedNodeContext();
  const { getFormulaResults } = useFormulaResultService();
  const pageLineMarkdownMapRef = useRef<Map<string, string>>(new Map<string, string>());
  const fetchedNodes = useRef<boolean>(false);
  const [createdChildNodes, setCreatedChildNodes] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isAskFormula = formula.startsWith("ask(");
  const isFlattenable = formula.startsWith("ask(") || formula.startsWith("find(");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    registerFormula(formula);
    return () => {
      unregisterFormula(formula);
    }
  }, [formula]);

  const createAskResultNodes = useCallback(async (outputMarkdown: string) => {
    // avoid some synchronization issue with editor updates
    setTimeout(() => {
      editor.dispatchCommand(CREATE_AND_STORE_FORMULA_OUTPUT, {
        displayNodeKey: nodeKey,
        output: outputMarkdown,
      });
    }, 0);
  }, [editor, nodeKey]);

  const getFormulaOutput = useCallback(async (_formula: string) => {
    if (!hasPromise(nodeKey)) {
      const dialogueContext = slurpPageAndDialogueContext(nodeKey, editor);
      setIsLoading(true);
      const promise = getFormulaResults(_formula, dialogueContext)
        .then(response => {
          setIsLoading(false);
          if (response) {
            if (response.type === FormulaValueType.Text) {
              if (!isAskFormula) {
                editor.dispatchCommand(STORE_FORMULA_OUTPUT, {
                  displayNodeKey: nodeKey,
                  output: response.output as string,
                });
                setOutput(response.output as string);
              } else {
                setCreatedChildNodes(true);
                editor.dispatchCommand(CREATE_AND_STORE_FORMULA_OUTPUT, {
                  displayNodeKey: nodeKey,
                  output: response.output as string,
                });
                setOutput(response.output as string);
              }
            } else if (response.type === FormulaValueType.NodeMarkdown) {
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
          const errorMessage = error instanceof Error 
            ? error.message 
            : "Unknown error occurred while processing formula";
          setOutput(`Error: ${errorMessage}`);
          setIsLoading(false);
          return null;
        })
        .finally(() => {
          removePromise(nodeKey);
        });
        if (promise) addPromise(nodeKey, promise);
      }
  }, [addPromise, removePromise, hasPromise, editor, nodeKey, getFormulaResults, isAskFormula]);

  //useWhatChanged([formula, output, getFormulaOutput]);
  useEffect(() => {
    if (!hasRunRef.current && (output === "" || (output === "@@childnodes" && !fetchedNodes.current))
    ) {
      hasRunRef.current = true;
      fetchedNodes.current = true;
      //if (output === "") setOutput("(getting response...)");
      
      getFormulaOutput(formula);
      
    }
  }, [getFormulaOutput]);

  //useWhatChanged([formula, output, sharedNodeMap, editor, nodeKey]);
  useEffect(() => {
    if (output === "@@childnodes" && fetchedNodes.current) {
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

        //console.log("about to dispatch CREATE_FORMULA_NODES", nodeKey, sharedNodes);
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
  }, [formula, output, sharedNodeMap, editor, nodeKey]);

  useEffect(() => {
    if (isAskFormula && !createdChildNodes && !fetchedNodes.current && output !== "") {
      fetchedNodes.current = true;
      setCreatedChildNodes(true);
      createAskResultNodes(output);
    }
  }, [output, isAskFormula, createdChildNodes, createAskResultNodes, formula]);

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

  const flattenOutput = () => {
    editor.dispatchCommand(FLATTEN_FORMULA_OUTPUT, {
      displayNodeKey: nodeKey
    });
  };

  const handlePencilClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent default selection behavior
    if (isFlattenable) {
      setShowMenu(!showMenu);
    } else {
      replaceSelfWithEditorNode();
    }
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
      setShowMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu, handleClickOutside]);

  const handleInteractionEnd = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString();

    if (!text) {
      editor.dispatchCommand(PUT_CURSOR_NEXT_TO_FORMULA_DISPLAY, {
        displayNodeKey: nodeKey
      });
    }
  }, [editor, nodeKey]);

  const handleEditDialogSubmit = (newValue: string) => {
    if (validateBlockId(newValue)) {
      editor.dispatchCommand(EDIT_FORMULA_NODE_BLOCK_ID, {
        displayNodeKey: nodeKey,
        blockId: newValue
      });
      setBlockId(newValue);
      setIsEditDialogOpen(false);
    } else {
      alert("Invalid block ID");
    }
  };

  const handleEditBlockId = () => {
    setShowMenu(false);
    setIsEditDialogOpen(true);
  };

  return (
    <div
      id="formula-display" 
      className="inline items-baseline pl-1 -ml-1 bg-bgFormula relative"
      style={{ WebkitUserSelect: 'text', userSelect: 'text', WebkitTouchCallout: 'default' }}
    >
      <span className="font-semibold">{formula}:
        <button 
          ref={buttonRef}
          className="inline-flex items-center justify-center p-1 text-xs hover:bg-gray-200 rounded" 
          onClick={handlePencilClick}
          tabIndex={-1}
        >
          <span role="img" aria-label="Edit" className="transform scale-x-[-1] filter grayscale-[70%]">✏️</span>
        </button>
        {showMenu && isFlattenable && (
          <div 
            ref={menuRef}
            className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg"
            style={{
              top: buttonRef.current ? buttonRef.current.offsetHeight + 5 : 0,
              left: buttonRef.current ? buttonRef.current.offsetLeft : 0,
              minWidth: '150px',
              width: 'max-content'
            }}
          >
            <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 font-normal text-sm text-gray-800 dark:text-gray-200" onClick={replaceSelfWithEditorNode}>
              Edit formula
            </button>
            <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 font-normal text-sm text-gray-800 dark:text-gray-200" onClick={flattenOutput}>
              Merge copy of results into document
            </button>
            <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 font-normal text-sm text-gray-800 dark:text-gray-200" onClick={handleEditBlockId}>
              Edit block ID
            </button>
          </div>
        )}
      </span>
      {blockId && <span className="block-id">{blockId}</span>}
      {!output.startsWith("@@") && !isFlattenable && <span>{output}</span>}
      {isLoading && <div><div className="spinner" /></div>}
      <EditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSubmit={handleEditDialogSubmit}
        initialValue={blockId}
        title="Edit block ID"
      />
    </div>
  );
}