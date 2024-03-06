import { 
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
} from "lexical";

import { ListItemNode } from "@lexical/list"

import {
  $createTodoCheckboxStatusNode, TodoCheckboxStatusNode,
  TodoStatus
} from '@/app/nodes/TodoNode';

const hasTodo = (node: ListItemNode): boolean => {
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

export const $unwrapTodoContents = (node: ListItemNode) => {
  if (!hasTodo(node) || !(node.getChildren()[0] instanceof TodoCheckboxStatusNode)) return;
  const todoNode = node.getChildren()[0] as TodoCheckboxStatusNode;
  todoNode.remove();
};

export const $handleSetTodoDoneValue = (done: boolean, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  const listItem = decoratorNode.getParent();
  if (!(listItem instanceof ListItemNode)) return;
  decoratorNode.setDone(done);
}

export const $handleSetTodoStatus = (status: TodoStatus, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  decoratorNode.setStatus(status);
}