import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  SerializedTextNode,
} from 'lexical';

import { ElementNode, TextNode } from 'lexical';

/*

<input type="checkbox" id="todo" name="todo" value="todo">
<label for="todo" data-content="Get out of bed">Get out of bed</label>

@import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro:600&display=swap');

$black: #363839;
$lightgray: #9c9e9f;
$gray: #bdc1c6;
$white: #fff;
$green: #06842c;

* {
  box-sizing: border-box;
  &::before, &::after {
    box-sizing: border-box;
  }
}

body {
  font-family: 'Source Sans Pro', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-height: 100vh;
}

input[type="checkbox"] {
  position: relative;
  width: 1.5em;
  height: 1.5em;
  color: $black;
  border: 1px solid $gray;
  border-radius: 4px;
  appearance: none;
  outline: 0;
  cursor: pointer;
  &::before {
    position: absolute;
    content: '';
    display: block;
    top: 2px;
    left: 7px;
    width: 8px;
    height: 14px;
    border-style: solid;
    border-color: $white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    opacity: 0;
  }
  &:checked {
    color: $white;
    border-color: $green;
    background: $green;
    &::before {
      opacity: 1;
    }
    ~ label::before {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
  }
}

label {
  position: relative;
  cursor: pointer;
  font-size: 1.5em;
  font-weight: 600;
  padding: 0 0.25em 0;
  user-select: none;
  &::before {
    position: absolute;
    content: attr(data-content);
    color: $lightgray;
    clip-path: polygon(0 0, 0 0, 0% 100%, 0 100%);
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    text-decoration-color: $black;
  }
}

*/

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

export class TodoStatusNode extends ElementNode {

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
