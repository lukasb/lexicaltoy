import { 
  $getSelection,
  $isRangeSelection,
} from "lexical";

import { ListItemNode } from "@lexical/list"

import {
  $createTodoNode, TodoNode,
  $createTodoStatusNode, TodoStatusNode,
  $createTodoCheckboxNode, TodoCheckboxNode,
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

  console.log("wrapLIContentsWithTodo", node.getTextContent());

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

  const checkboxNode = $createTodoCheckboxNode(status === "DONE");
  replacementNode.append(checkboxNode);
  const statusNode = $createTodoStatusNode(status);
  replacementNode.append(statusNode);

  for (const child of node.getChildren()) {
    child.remove();
    replacementNode.append(child);
  }

  node.append(replacementNode);
  selectedNode.select(start, start);
};

export const $unwrapTodoContents = (node: ListItemNode) => {
  
  console.log("unwrapLIContents", node.getTextContent());

  if (!hasTodo(node) || !(node.getChildren()[0] instanceof TodoNode)) return;

  const todoNode = node.getChildren()[0] as TodoNode;
  todoNode.remove();
  for (const child of todoNode.getChildren()) {
    if (!(child instanceof TodoCheckboxNode || child instanceof TodoStatusNode)) {
      child.remove();
      node.append(child);
    }
  }

};

export const $toggleTodoStatus = (node: TodoNode) => {
  const statusNode = node.getChildren()[1];
  if (!(statusNode instanceof TodoStatusNode)) return;
  const status = statusNode.getStatus();
  switch (status) {
    case "TODO":
      statusNode.setStatus("DOING");
      break;
    case "DOING":
      statusNode.setStatus("TODO");
      break;
    case "NOW":
      statusNode.setStatus("LATER");
      break;
    case "LATER":
        statusNode.setStatus("NOW");
        break;  
    default:
      break;
  }
}

export const $toggleTodoDone = (node: TodoNode) => {
  const checkboxNode = node.getChildren()[0];
  if (!(checkboxNode instanceof TodoCheckboxNode)) return;
  checkboxNode.setChecked(!checkboxNode.getChecked());
  // TODO: other stuff
}