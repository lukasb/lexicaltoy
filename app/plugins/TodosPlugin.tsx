import { useEffect } from 'react';
import { LexicalEditor, COMMAND_PRIORITY_EDITOR, BaseSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import {
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
  SET_TODO_DONE_VALUE_COMMAND,
  SET_TODO_STATUS_COMMAND
} from '@/app/lib/todo-commands';
import { ListItemNode } from '@lexical/list';
import { $isRangeSelection } from 'lexical';
import { $getSelection } from 'lexical';

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
  }
  return null;
}

function todoInsertCommand(status: TodoStatus, done: boolean) {
  const theSelection = $getSelection();
  if (!theSelection)  return;
  const listItem = getListItemFromSelection(theSelection);
  if (listItem) {
    $wrapLIContentsWithTodo(listItem, status, done);
  }
}

function registerTodoHandlers(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      INSERT_TODO_COMMAND,
      () => {
        todoInsertCommand("TODO", false);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_DOING_TODO_COMMAND,
      () => {
        todoInsertCommand("DOING", false);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_NOW_TODO_COMMAND,
      () => {
        todoInsertCommand("NOW", false);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_LATER_TODO_COMMAND,
      () => {
        todoInsertCommand("LATER", false);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      SET_TODO_STATUS_COMMAND,
      ({ status, todoNodeKey }) => {
        $handleSetTodoStatus(status, todoNodeKey);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      SET_TODO_DONE_VALUE_COMMAND,
      ({ done, todoNodeKey }) => {
        $handleSetTodoDoneValue(editor, done, todoNodeKey);
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
    )
  );
}

export function TodosPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([TodoCheckboxStatusNode])) {
      throw new Error('TodoPlugin: TodoCheckboxStatusNode not registered on editor');
    }
    return registerTodoHandlers(editor);
  }, [editor]);

  return null;
}