import { useEffect } from 'react';
import { LexicalEditor, COMMAND_PRIORITY_EDITOR, BaseSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import {
  TodoNode,
  TodoCheckboxStatusNode,
  TodoStatus
} from '@/app/nodes/TodoNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import { $wrapLIContentsWithTodo, $unwrapTodoContents, $handleSetTodoStatus, $handleSetTodoDoneValue } from '@/app/lib/todo-helpers';
import { 
  INSERT_TODO_COMMAND,
  INSERT_DOING_TODO_COMMAND,
  INSERT_NOW_TODO_COMMAND,
  INSERT_LATER_TODO_COMMAND,
  REMOVE_TODO_COMMAND,
  SET_TODO_DONE_VALUE_COMMAND
} from '@/app/lib/todo-commands';
import { ListItemNode } from '@lexical/list';
import { $isRangeSelection } from 'lexical';
import { $getSelection } from 'lexical';
import { todo } from 'node:test';

function getListItemFromSelection(selection: BaseSelection): ListItemNode | null {
  if (
    selection === null ||
    !$isRangeSelection(selection) ||
    !selection.isCollapsed()
  ) {
    return null;
  }
  const node = selection.anchor.getNode().getParent();
  if (node instanceof ListItemNode) {
    return node;
  } else if (node instanceof TodoNode && node.getParent() instanceof ListItemNode) {
    return node.getParent();
  }
  return null;
}

function todoInsertCommand(status: TodoStatus) {
  const theSelection = $getSelection();
  if (!theSelection)  return;
  const listItem = getListItemFromSelection(theSelection);
  if (listItem) {
    $wrapLIContentsWithTodo(listItem, status);
  }
}

function todoNodeTransform(node: TodoNode) {
  // if the decorator node is removed, remove the todo node
  const checkboxStatus = node.getChildren().find((child) => child instanceof TodoCheckboxStatusNode) as TodoCheckboxStatusNode;
  if (!checkboxStatus) {
    const listItem = node.getParent();
    if (listItem instanceof ListItemNode) {
      $unwrapTodoContents(listItem);
    }
  }
}

function registerTodoHandlers(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      INSERT_TODO_COMMAND,
      () => {
        todoInsertCommand("TODO");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_DOING_TODO_COMMAND,
      () => {
        todoInsertCommand("DOING");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_NOW_TODO_COMMAND,
      () => {
        todoInsertCommand("NOW");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_LATER_TODO_COMMAND,
      () => {
        todoInsertCommand("LATER");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      SET_TODO_DONE_VALUE_COMMAND,
      ({ done, todoNodeKey }) => {
        $handleSetTodoDoneValue(done, todoNodeKey);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      REMOVE_TODO_COMMAND,
      () => {
        const theSelection = $getSelection();
        if (!theSelection) {
          return true;
        }
        const listItem = getListItemFromSelection(theSelection);
        if (listItem) {
          $unwrapTodoContents(listItem);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerNodeTransform(TodoNode, todoNodeTransform)
  );
}

export function TodosPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([TodoNode, TodoCheckboxStatusNode])) {
      throw new Error('TodoPlugin: TodoNode and/or TodoCheckboxStatusNode not registered on editor');
    }
    return registerTodoHandlers(editor);
  }, [editor]);

  return null;
}