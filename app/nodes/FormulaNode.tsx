import {
  EditorConfig,
  LexicalNode,
  SerializedTextNode,
  DecoratorNode,
  NodeKey,
  SerializedLexicalNode,
  Spread
} from 'lexical';

import { TextNode, $isTextNode } from 'lexical';

import FormulaDisplayComponent from './FormulaDisplayComponent';

export class FormulaEditorNode extends TextNode {
  static getType(): string {
    return 'formula-editor';
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = 'PlaygroundEditorTheme__formulaEditorNode';
    return dom;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'formula-editor',
      version: 1
    };
  }

  static importJSON(serializedNode: SerializedTextNode): FormulaEditorNode {
    return $createFormulaEditorNode(serializedNode.text);
  }

  static clone(node: FormulaEditorNode): FormulaEditorNode {
    return new FormulaEditorNode(node.getTextContent(), node.__key);
  }

  canInsertTextBefore(): boolean {
    return true;
  }

  canInsertTextAfter(): boolean {
    return true;
  }
}

export function $createFormulaEditorNode(text: string): FormulaEditorNode {
  return new FormulaEditorNode(text);
}

/**
 * Determines if node is a FormulaNode.
 * @param node - The node to be checked.
 * @returns true if node is a FormulaNode, false otherwise.
 */
export function $isFormulaEditorNode(
  node: LexicalNode | null | undefined,
): node is FormulaEditorNode {
  return node instanceof FormulaEditorNode;
}

export type SerializedFormulaDisplayNode = Spread<
  {
    formula: string;
    caption: string;
    output: string;
  },
  SerializedLexicalNode
>;

export class FormulaDisplayNode extends DecoratorNode<JSX.Element> {
  
  __formula: string;
  __caption: string;
  __output: string;

  getFormula(): string {
    const self = this.getLatest();
    return self.__formula;
  }

  setFormula(formula: string): void {
    const self = this.getWritable();
    self.__formula = formula;
  }

  getCaption(): string {
    const self = this.getLatest();
    return self.__caption;
  }

  setCaption(caption: string): void {
    const self = this.getWritable();
    self.__caption = caption;
  }

  getOutput(): string {
    const self = this.getLatest();
    return self.__output;
  }

  setOutput(output: string): void {
    const self = this.getWritable();
    self.__output = output;
  }


  static getType(): string {
    return 'formula-display';
  }

  static clone(node: FormulaDisplayNode): FormulaDisplayNode {
    console.log("cloning");
    return new FormulaDisplayNode(node.getFormula(), node.getCaption(), node.getOutput(), node.__key);
  }

  constructor(formula: string, caption?: string, output?: string, key?: NodeKey) {
    console.log("constructing");
    super(key);
    this.__formula = formula;
    this.__caption = caption ? caption : "";
    this.__output = output ? output : "";
  }


  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    element.classList.add('inline-flex');
    return element;
  }

  updateDOM(_prevNode: FormulaDisplayNode, _dom: HTMLElement, config: EditorConfig): boolean {
    return (this.__caption !== _prevNode.__caption || this.__output !== _prevNode.__output);
  }

  static importJSON(serializedNode: SerializedFormulaDisplayNode): FormulaDisplayNode {
    return $createFormulaDisplayNode(serializedNode.formula, serializedNode.caption, serializedNode.output);
  }

  exportJSON(): SerializedFormulaDisplayNode {
    return {
      type: 'formula-display',
      version: 1,
      formula: this.__formula,
      caption: this.__caption,
      output: this.__output
    };
  }

  decorate(): JSX.Element {
    console.log("decorating");
    return (
      <FormulaDisplayComponent
        formula={this.__formula}
        caption={this.__caption}
        output={this.__output}
        nodeKey={this.getKey()}
      />
    );
  }

  isInline(): boolean {
    return true;
  }

  isTextSelectable(): boolean {
    return true;
  }
}

export function $isFormulaDisplayNode(node: LexicalNode): node is FormulaDisplayNode {
  return node instanceof FormulaDisplayNode;
}

export function $createFormulaDisplayNode(
  formula: string, caption?: string, output?: string
): FormulaDisplayNode {
  return new FormulaDisplayNode(formula, caption, output);
}
