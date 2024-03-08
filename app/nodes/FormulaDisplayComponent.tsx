import { useState, useEffect } from 'react';

export default function FormulaDisplayComponent(
  { formula: initialFormula,
    caption: initialCaption, 
    output: initialOutput 
  }: 
  {
    formula: string,
    caption: string,
    output: string
  }
): JSX.Element {
  const [formula, setFormula] = useState<string>(initialFormula);
  const [caption, setCaption] = useState<string>(initialCaption);
  const [output, setOutput] = useState<string>(initialOutput);

  useEffect(() => {
    setOutput(formula.length.toString());
  }, [formula]);

  return (
    <div className="inline-flex items-baseline border-2 border-dashed border-red-600">
      <span>{caption}: </span>
      <span>{output}</span>
    </div>
  );
}
