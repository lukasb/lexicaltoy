import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  SerializedTextNode,
} from 'lexical';

import { ElementNode, TextNode } from 'lexical';

export type SerializedTodoNode = SerializedElementNode;

export class TodoTextNode extends TextNode {
  static getType(): string {
    return 'todo-text';
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    return dom;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'todo-text',
      version: 1
    };
  }

  static importJSON(serializedNode: SerializedTextNode): TodoTextNode {
    return $createTodoTextNode(serializedNode.text);
  }

  static clone(node: TodoTextNode): TodoTextNode {
    return new TodoTextNode(node.getTextContent(), node.__key);
  }

  canInsertTextBefore(): boolean {
    return true;
  }

  canInsertTextAfter(): boolean {
    return true;
  }
}

export function $createTodoTextNode(text: string): TodoTextNode {
  return new TodoTextNode(text);
}

export type TodoStatus = 'NOW' | 'LATER' | 'TODO' | 'DOING' | 'DONE';

export class TodoStatusNode extends TextNode {

  __status: TodoStatus;

  constructor(status: TodoStatus, key?: NodeKey) {
    super(status, key);
    this.__status = status;
  }

  getStatus(): TodoStatus {
    const self = this.getLatest();
    return self.__status;
  }

  setStatus(status: TodoStatus): void {
    const self = this.getLatest();
    self.__status = status;
    self.setTextContent(status);
  }

  static getType(): string {
    return 'todo-status';
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add('PlaygroundEditorTheme__todoStatus');
    return dom;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'todo-status',
      version: 1
    };
  }

  static importJSON(serializedNode: SerializedTextNode): TodoTextNode {
    return $createTodoTextNode(serializedNode.text);
  }

  static clone(node: TodoTextNode): TodoTextNode {
    return new TodoTextNode(node.getTextContent(), node.__key);
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

/**
 * Generates a TodoNode. Just a container, TodoPlugin is responsible for inserting the rest of the nodes.
 * @returns - The TodoNode
 */
export function $createTodoStatusNode(status: TodoStatus): TodoStatusNode {
  return new TodoStatusNode(status);
}


export class TodoNode extends ElementNode {

  static getType(): string {
    return 'todo';
  }

  static clone(node: TodoNode): TodoNode {
    return new TodoNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const element = document.createElement('span');
    return element;
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, config: EditorConfig): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedTodoNode): TodoNode {
    return $createTodoNode();
  }

  exportJSON(): SerializedTodoNode {
    return {
      ...super.exportJSON(),
      type: 'todo',
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
    return true;
  }

  isInline(): boolean {
    return true;
  }
}

/**
 * Generates a TodoNode. Just a container, TodoPlugin is responsible for inserting the rest of the nodes.
 * @returns - The TodoNode
 */
export function $createTodoNode(): TodoNode {
  return new TodoNode();
}

/**
 * Determines if node is a TodoNode.
 * @param node - The node to be checked.
 * @returns true if node is a TodoNode, false otherwise.
 */
export function $isTodoNode(
  node: LexicalNode | null | undefined,
): node is TodoNode {
  return node instanceof TodoNode;
}
