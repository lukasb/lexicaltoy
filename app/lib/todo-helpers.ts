import { 
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  LexicalEditor,
} from "lexical";

import { ListItemNode } from "@lexical/list"

import {
  $createTodoCheckboxStatusNode, TodoCheckboxStatusNode,
  TodoStatus
} from '@/app/nodes/TodoNode';

export const TodoDoneTextClass = "PlaygroundEditorTheme__todoDoneText";

export const hasTodo = (node: ListItemNode): boolean => {
  if (node.getChildren().length === 0) {
    return false;
  }
  const firstChild = node.getChildren()[0];
  if (firstChild instanceof TodoCheckboxStatusNode) {
    return true;
  }
  return false;
}

export const $wrapLIContentsWithTodo = (node: ListItemNode, status: TodoStatus, done: boolean) => {

  if (hasTodo(node)) return;
  
  const selection = $getSelection();
  if (
    selection === null ||
    !$isRangeSelection(selection) ||
    !selection.isCollapsed()
  ) {
    return;
  }

  const start = selection.anchor.offset;
  const selectedNode = selection.anchor.getNode();

  const todoNode = $createTodoCheckboxStatusNode(status, done);
  node.splice(0, 0, [todoNode]);
  
  selectedNode.select(start, start);
};

export const $changeTodoStatus = (node: ListItemNode, status: TodoStatus) => {
  if (!hasTodo(node)) return;
  const todoNode = node.getChildren()[0] as TodoCheckboxStatusNode;
  $handleSetTodoStatus(status, todoNode.getKey());
}

export const $unwrapTodoContents = (node: ListItemNode) => {
  if (!hasTodo(node) || !(node.getChildren()[0] instanceof TodoCheckboxStatusNode)) return;
  const todoNode = node.getChildren()[0] as TodoCheckboxStatusNode;
  todoNode.remove();
};

export const $handleSetTodoDoneValue = (editor: LexicalEditor, done: boolean, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  const listItem = decoratorNode.getParent();
  if (!(listItem instanceof ListItemNode)) return;
  for (const child of listItem.getChildren()) {
    if ($isTextNode(child)) {
      const elem = editor.getElementByKey(child.getKey());
      if (elem) {
        if (done) elem.classList.add(TodoDoneTextClass);
        else elem.classList.remove(TodoDoneTextClass);
      }
    }
  }
  decoratorNode.setDone(done);
}

export const $handleSetTodoStatus = (status: TodoStatus, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  decoratorNode.setStatus(status);
}