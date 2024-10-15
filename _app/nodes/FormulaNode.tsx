import {
  EditorConfig,
  LexicalNode,
  SerializedTextNode,
  DecoratorNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { TextNode } from 'lexical';
import FormulaDisplayComponent from './FormulaDisplayComponent';
import { getFormulaMarkdown } from '@/lib/formula/formula-markdown-converters';
import { BLOCK_ID_REGEX } from '@/lib/blockref';

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
  const prepend = text.startsWith("=") ? "" : "=";
  return new FormulaEditorNode(prepend + text);
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
    formula: string
    output: string;
    blockId: string;
  },
  SerializedLexicalNode
>;

export type FormulaDisplayNodeType = "nodeFormula" | "simpleGptFormula" | "complexGptFormula";

export class FormulaDisplayNode extends DecoratorNode<JSX.Element> {
  
  __formula: string;
  __output: string;
  __blockId: string;

  getFormula(): string {
    const self = this.getLatest();
    return self.__formula;
  }

  setFormula(formula: string): void {
    const self = this.getWritable();
    self.__formula = formula;
  }

  getOutput(): string {
    const self = this.getLatest();
    return self.__output;
  }

  setOutput(output: string): void {
    const self = this.getWritable();
    self.__output = output;
  }

  getBlockId(): string | undefined {
    const self = this.getLatest();
    return self.__blockId;
  }

  setBlockId(blockId: string): void {
    const self = this.getWritable();
    self.__blockId = blockId;
  }

  static getType(): string {
    return 'formula-display';
  }

  static clone(node: FormulaDisplayNode): FormulaDisplayNode {
    return new FormulaDisplayNode(node.getFormula(), node.getOutput(), node.getBlockId(), node.__key);
  }

  constructor(formula: string, output?: string, blockId?: string, key?: NodeKey) {
    super(key);
    this.__formula = formula;
    this.__output = output ? output : "";
    this.__blockId = blockId ? blockId : "";
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    element.classList.add('inline-flex');
    return element;
  }

  updateDOM(_prevNode: FormulaDisplayNode, _dom: HTMLElement, config: EditorConfig): boolean {
    return (this.__output !== _prevNode.__output);
  }

  static importJSON(serializedNode: SerializedFormulaDisplayNode): FormulaDisplayNode {
    return $createFormulaDisplayNode(serializedNode.formula, serializedNode.output, serializedNode.blockId);
  }

  exportJSON(): SerializedFormulaDisplayNode {
    return {
      type: 'formula-display',
      version: 1,
      formula: this.__formula,
      output: this.__output,
      blockId: this.__blockId
    };
  }

  decorate(): JSX.Element {
    return (
      <FormulaDisplayComponent
        formula={this.__formula}
        output={this.__output}
        blockId={this.__blockId}
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

  getTextContent(): string {
    const text = getFormulaMarkdown(this.getFormula(), this.getOutput(), this.getBlockId());
    return text;
  }

  hasResultNodes(): boolean {
    return this.getFormulaDisplayNodeType() === "nodeFormula" || this.getFormulaDisplayNodeType() === "complexGptFormula";
  }

  getFormulaDisplayNodeType(): FormulaDisplayNodeType {
    if (this.getOutput() === "@@childnodes") {
      return "nodeFormula";
    } else if (this.getFormula().startsWith("ask(")) {
      return "complexGptFormula";
    } else {
      return "simpleGptFormula";
    }
  }
}

export function $isFormulaDisplayNode(node: LexicalNode | null | undefined): node is FormulaDisplayNode {
  return node instanceof FormulaDisplayNode;
}

export function $createFormulaDisplayNode(
  formula: string, output?: string, blockId?: string
): FormulaDisplayNode {
  return new FormulaDisplayNode(formula, output, blockId);
}
