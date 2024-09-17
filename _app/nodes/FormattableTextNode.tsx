import { 
  EditorConfig,
  TextNode,
  SerializedTextNode,
  Spread,
  LexicalNode
} from 'lexical';

export type SerializedFormattableTextNode = Spread<
  {
    strikethrough: boolean;
  },
  SerializedTextNode
>;

export class FormattableTextNode extends TextNode {

  __strikeThrough: boolean = false;

  constructor(text: string, key?: string, strikethrough: boolean = false) {
    super(text, key);
    this.__strikeThrough = strikethrough;
  }

  static getType(): string {
    return 'formattable-text';
  }

  setStrikethrough(strikeThrough: boolean): void {
    const self = this.getWritable();
    self.__strikeThrough = strikeThrough;
  }

  getStrikethrough(): boolean {
    const self = this.getLatest();
    return self.__strikeThrough;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    const self = this.getLatest();
    if (self.__strikeThrough) {
      dom.classList.add('PlaygroundEditorTheme__todoDoneText');
    } else {
      if (dom.classList.contains('PlaygroundEditorTheme__todoDoneText')) {
        dom.classList.remove('PlaygroundEditorTheme__todoDoneText');
      }
    }
    return dom;
  }

  updateDOM(prevNode: FormattableTextNode, dom: HTMLElement, config: EditorConfig): boolean {
    const self = this.getLatest();
    if (self.__strikeThrough && !dom.classList.contains('PlaygroundEditorTheme__todoDoneText')
    || !self.__strikeThrough && dom.classList.contains('PlaygroundEditorTheme__todoDoneText')) {
      return true;
    }
    const update = super.updateDOM(prevNode, dom, config);
    return update;
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
    return new FormattableTextNode(node.getTextContent(), node.__key, node.getStrikethrough());
  }

  // without this users can't type in the text node
  // docs should mention that maybe??
  isSimpleText(): boolean {
    return true;
  }

/*
  canHaveFormat(): boolean {
    return true;
  }
  
  canInsertTextBefore(): boolean {
    return true;
  }

  canInsertTextAfter(): boolean {
    return true;
  }
  */
}

export function $createFormattableTextNode(text: string, strikethrough: boolean = false): FormattableTextNode {
  return new FormattableTextNode(text, undefined, strikethrough);
}

export function $isFormattableTextNode(node: LexicalNode): node is FormattableTextNode {
  return node instanceof FormattableTextNode;
}