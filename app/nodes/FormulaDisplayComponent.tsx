import { useState, useEffect, useCallback, useContext, use } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  SWAP_FORMULA_DISPLAY_FOR_EDITOR,
  STORE_FORMULA_OUTPUT
} from '@/app/lib/formula-commands';
import { getFormulaOutput } from '@/app/lib/formula/FormulaOutput';
import { PagesContext } from '../context/pages-context';
import { usePromises } from '../context/formula-request-context';

import './FormulaDisplayComponent.css';

export default function FormulaDisplayComponent(
  { formula: initialFormula,
    caption: initialCaption, 
    output: initialOutput,
    nodeKey
  }: 
  {
    formula: string,
    caption: string,
    output: string,
    nodeKey: string
  }
): JSX.Element {
  const [formula, setFormula] = useState<string>(initialFormula);
  const [caption, setCaption] = useState<string>(initialCaption);
  const [output, setOutput] = useState<string>(initialOutput);
  const [editor] = useLexicalComposerContext();
  const pages = useContext(PagesContext);
  const { promisesMap, addPromise, removePromise, hasPromise } = usePromises();

  const getGPTResponse = useCallback(async (prompt: string) => {
    if (!hasPromise(nodeKey)) {
      const promise = getFormulaOutput(prompt, pages)
        .then(response => {
          if (response) {
            setOutput(response.output);
            setCaption(response.caption);
            editor.dispatchCommand(STORE_FORMULA_OUTPUT, {
              displayNodeKey: nodeKey,
              output: response.output,
              caption: response.caption
            });
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
  }, [addPromise, removePromise, hasPromise, editor, nodeKey, pages]);

  useEffect(() => {
    if (output === "") {
      setOutput("(getting response...)");
      getGPTResponse(formula);
    }
  }, [formula, output, getGPTResponse]);

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
      <span>{caption}: </span>
      <span>{output}</span>
    </div>
  );
}
