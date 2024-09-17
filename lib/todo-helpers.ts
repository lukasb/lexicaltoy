import { 
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  LexicalNode
} from "lexical";
import { ListItemNode } from "@lexical/list"
import {
  $createTodoCheckboxStatusNode, TodoCheckboxStatusNode,
  TodoStatus
} from '@/_app/nodes/TodoNode';
import { $isFormattableTextNode } from "@/_app/nodes/FormattableTextNode";

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

  if (hasTodo(node)) {
    return;
  }
  
  const selection = $getSelection();
  let start = 0;
  let selectedNode: LexicalNode = node;
  if (
    selection && 
    $isRangeSelection(selection) &&
    selection.isCollapsed()
  ) {
    start = selection.anchor.offset;
    selectedNode = selection.anchor.getNode();
  }

  const todoNode = $createTodoCheckboxStatusNode(status, done);
  node.splice(0, 0, [todoNode]);
  
  if (
    selection && 
    $isRangeSelection(selection) &&
    selection.isCollapsed() &&
    ($isTextNode(selectedNode) || $isElementNode(selectedNode))
  ) {
    selectedNode.select(start, start);
  }
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

export const $setTodoStrikethrough = (node: ListItemNode, done: boolean) => {  
  for (const child of node.getChildren()) {
    if ($isFormattableTextNode(child)) {
      child.setStrikethrough(done);
    } else if ($isElementNode(child)) {
      for (const nestedChild of child.getChildren()) {
        if ($isFormattableTextNode(nestedChild)) {
          nestedChild.setStrikethrough(done);
        }
      }
    }
  }
};

export const $handleSetTodoDoneValue = (done: boolean, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  const listItem = decoratorNode.getParent();
  if (!(listItem instanceof ListItemNode)) return;
  $setTodoStrikethrough(listItem, done);
  decoratorNode.setDone(done);
}

export const $handleSetTodoStatus = (status: TodoStatus, nodeKey: string) => {
  const decoratorNode = $getNodeByKey(nodeKey);
  if (!(decoratorNode instanceof TodoCheckboxStatusNode)) return;
  decoratorNode.setStatus(status);
}