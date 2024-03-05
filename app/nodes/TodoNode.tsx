import {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  SerializedLexicalNode,
  DecoratorNode,
  ElementNode,
  Spread
} from 'lexical';

import TodoCheckboxStatusComponent from './TodoCheckboxStatusComponent';

export type SerializedTodoNode = SerializedElementNode;

export type SerializedTodoCheckboxStatusNode = Spread<
  {
    status: TodoStatus;
    done: boolean;
  },
  SerializedLexicalNode
>;

export type TodoStatus = 'NOW' | 'LATER' | 'TODO' | 'DOING' | 'DONE';

export class TodoCheckboxStatusNode extends DecoratorNode<JSX.Element> {
  
  __status: TodoStatus;
  __done: boolean;

  getStatus(): TodoStatus {
    const self = this.getLatest();
    return self.__status;
  }

  setStatus(status: TodoStatus): void {
    const self = this.getWritable();
    self.__status = status;
  }

  getDone(): boolean {
    const self = this.getLatest();
    return self.__done;
  }

  setDone(done: boolean): void {
    const self = this.getWritable();
    self.__done = done;
  }

  static getType(): string {
    return 'todo-checkbox-status';
  }

  static clone(node: TodoCheckboxStatusNode): TodoCheckboxStatusNode {
    return new TodoCheckboxStatusNode(node.getStatus(), node.getDone(), node.__key);
  }

  constructor(status: TodoStatus, done: boolean, key?: NodeKey) {
    super(key);
    this.__status = status;
    this.__done = done;
  }


  createDOM(config: EditorConfig): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, config: EditorConfig): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedTodoCheckboxStatusNode): TodoCheckboxStatusNode {
    return $createTodoCheckboxStatusNode(serializedNode.status, serializedNode.done);
  }

  exportJSON(): SerializedTodoCheckboxStatusNode {
    return {
      type: 'todo-checkbox-status',
      version: 1,
      status: this.__status,
      done: this.__done
    };
  }

  decorate(): JSX.Element {
    return (
      <TodoCheckboxStatusComponent
        todoStatus={this.__status}
        todoDone={this.__done}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createTodoCheckboxStatusNode(
  status: TodoStatus, done: boolean
): TodoCheckboxStatusNode {
  return new TodoCheckboxStatusNode(status, done);
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
