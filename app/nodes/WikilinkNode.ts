import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  SerializedTextNode,
} from 'lexical';
import { ElementNode } from 'lexical';
import { 
  FormattableTextNode,
  SerializedFormattableTextNode
} from './FormattableTextNode';

export type SerializedWikilinkNode = SerializedElementNode;

export class WikilinkInternalNode extends FormattableTextNode {
  static getType(): string {
    return 'wikilink-internal';
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    if (this.getTextContent().startsWith('[') || this.getTextContent().startsWith(']')) {
      console.log('bracket', dom.classList);
      dom.classList.add('PlaygroundEditorTheme__wikilinkBracket');
    } else {
      console.log('title', dom.classList);
      dom.classList.add('PlaygroundEditorTheme__wikilinkPageTitle');
    }
    return dom;
  }

  exportJSON(): SerializedFormattableTextNode {
    return {
      ...super.exportJSON(),
      type: 'wikilink-internal',
      version: 1
    };
  }

  static importJSON(serializedNode: SerializedTextNode): WikilinkInternalNode {
    return $createWikilinkInternalNode(serializedNode.text);
  }

  static clone(node: WikilinkInternalNode): WikilinkInternalNode {
    return new WikilinkInternalNode(node.getTextContent(), node.__key);
  }

  canInsertTextBefore(): boolean {
    // TODO - this is a hack to prevent the user from typing in the brackets, should be a type check or something
    if (this.getTextContent().startsWith('[') || this.getTextContent().startsWith(']')) {
      return false;
    } else {
      return true;
    }
  }

  canInsertTextAfter(): boolean {
    if (this.getTextContent().startsWith('[') || this.getTextContent().startsWith(']')) {
      return false;
    } else {
      return true;
    }
  }
  
  isUnmergeable(): boolean {
    return true;
  }
}

export function $createWikilinkInternalNode(text: string): WikilinkInternalNode {
  // used to be applyNodeReplacement no idea why
  return new WikilinkInternalNode(text);
}

/** @noInheritDoc */
export class WikilinkNode extends ElementNode {

  static getType(): string {
    return 'wikilink';
  }

  static clone(node: WikilinkNode): WikilinkNode {
    return new WikilinkNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {

    // create a parent span element for the wikilink
    const element = document.createElement('span');
    return element;
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, config: EditorConfig): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedWikilinkNode): WikilinkNode {
    return $createWikilinkNode();
  }

  exportJSON(): SerializedWikilinkNode {
    return {
      ...super.exportJSON(),
      type: 'wikilink',
      version: 1
    };
  }

  isTextEntity(): boolean {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }
}

/**
 * Generates a WikilinkNode. Just a container, WikilinkPlugin is responsible for inserting the rest of the nodes.
 * @returns - The WikilinkNode
 */
export function $createWikilinkNode(): WikilinkNode {
  //return $applyNodeReplacement(new WikilinkNode());
  return new WikilinkNode();
}

/**
 * Determines if node is a WikilinkNode.
 * @param node - The node to be checked.
 * @returns true if node is a WikilinkNode, false otherwise.
 */
export function $isWikilinkNode(
  node: LexicalNode | null | undefined,
): node is WikilinkNode {
  return node instanceof WikilinkNode;
}
