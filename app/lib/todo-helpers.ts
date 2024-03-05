import { 
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
} from "lexical";

import { ListItemNode } from "@lexical/list"

import {
  $createTodoNode, TodoNode,
  $createTodoCheckboxStatusNode, TodoCheckboxStatusNode,
  TodoStatus
} from '@/app/nodes/TodoNode';

const hasTodo = (node: ListItemNode): boolean => {
  if (node.getChildren().length === 0) {
    return false;
  }
  const firstChild = node.getChildren()[0];
  if (firstChild instanceof TodoNode) {
    return true;
  }
  return false;
}

export const $wrapLIContentsWithTodo = (node: ListItemNode, status: TodoStatus) => {

  if (hasTodo(node)) return;
  
  const selection = $getSelection();
  if (
    selection === null ||
    !$isRangeSelection(selection) ||
    !selection.isCollapsed()
  ) {
    return;
  }

  const replacementNode = $createTodoNode();
  const start = selection.anchor.offset;
  const selectedNode = selection.anchor.getNode();

  const checkboxNode = $createTodoCheckboxStatusNode(status, status === "DONE");
  replacementNode.append(checkboxNode);
  
  for (const child of node.getChildren()) {
    child.remove();
    replacementNode.append(child);
  }

  node.append(replacementNode);
  selectedNode.select(start, start);
};

export const $unwrapTodoContents = (node: ListItemNode) => {
  if (!hasTodo(node) || !(node.getChildren()[0] instanceof TodoNode)) return;
  const todoNode = node.getChildren()[0] as TodoNode;
  todoNode.remove();
  for (const child of todoNode.getChildren()) {
    if (!(child instanceof TodoCheckboxStatusNode)) {
      child.remove();
      node.append(child);
    }
  }
};

export const $handleSetTodoDoneValue = (done: boolean, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  const todoNode = decoratorNode.getParent();
  if (!(todoNode instanceof TodoNode)) return;
  todoNode
  for (const child of todoNode.getChildren()) {
    if (child instanceof TodoCheckboxStatusNode) {
      continue;
    }
    // TODO set strikethrough format based on value of done
  }
  decoratorNode.setDone(done);
}

export const $handleSetTodoStatus = (status: TodoStatus, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  decoratorNode.setStatus(status);
}