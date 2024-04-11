import { 
  EditorConfig,
  TextNode,
  SerializedTextNode,
  Spread
} from 'lexical';

export type SerializedFormattableTextNode = Spread<
  {
    strikethrough: boolean;
  },
  SerializedTextNode
>;

export class FormattableTextNode extends TextNode {

  __strikeThrough: boolean = false;

  static getType(): string {
    return 'formattable-text';
  }

  setStrikethrough(strikeThrough: boolean): void {
    const self = this.getWritable();
    self.__strikeThrough = strikeThrough;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    const self = this.getLatest();
    if (self.__strikeThrough) {
      dom.className = 'PlaygroundEditorTheme__todoDoneText';
    } else {
      dom.className = '';
    }
    return dom;
  }

  updateDOM(prevNode: FormattableTextNode, dom: HTMLElement, config: EditorConfig): boolean {
    const self = this.getLatest();
    if (self.__strikeThrough && !dom.classList.contains('PlaygroundEditorTheme__todoDoneText')
    || !self.__strikeThrough && dom.classList.contains('PlaygroundEditorTheme__todoDoneText')) {
      return true;
    }
    return false;
  }

  exportJSON(): SerializedFormattableTextNode {
    return {
      ...super.exportJSON(),
      type: 'formattable-text',
      strikethrough: this.__strikeThrough,
      version: 1
    };
  }

  static importJSON(serializedNode: SerializedFormattableTextNode): FormattableTextNode {
    return $createFormattableTextNode(serializedNode.text);
  }

  static clone(node: FormattableTextNode): FormattableTextNode {
    return new FormattableTextNode(node.getTextContent(), node.__key);
  }

  canHaveFormat(): boolean {
    return true;
  }
  
  canInsertTextBefore(): boolean {
    return true;
  }

  canInsertTextAfter(): boolean {
    return true;
  }
}

export function $createFormattableTextNode(text: string): FormattableTextNode {
  return new FormattableTextNode(text);
}

export function $isFormattableTextNode(node: TextNode): node is FormattableTextNode {
  return node instanceof FormattableTextNode;
}