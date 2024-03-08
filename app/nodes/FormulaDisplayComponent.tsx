import { useState, useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SWAP_FORMULA_DISPLAY_FOR_EDITOR } from '@/app/lib/formula-commands';
import { getShortGPTChatResponse } from '@/app/lib/ai-actions';

import './FormulaDisplayComponent.css';
import { get } from 'http';

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

  const getGPTResponse = async (prompt: string) => {
    const response = await getShortGPTChatResponse(prompt);
    if (response) {
      setOutput(response);
    }
  }

  useEffect(() => {
    setOutput("(getting response...)");
    getGPTResponse(formula);
  }, [formula]);

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
      className="inline-flex items-baseline border-2 border-dashed border-red-600"
      onClick={() => replaceSelfWithEditorNode()}
    >
      <span>{caption}: </span>
      <span>{output}</span>
    </div>
  );
}
