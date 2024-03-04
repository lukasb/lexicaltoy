import { useEffect } from 'react';
import { LexicalEditor, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import {
  TodoNode,
  TodoStatusNode,
  TodoCheckboxNode
} from '@/app/nodes/TodoNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import { $wrapLIContentsWithTodo, $unwrapTodoContents, $toggleTodoStatus, $toggleTodoDone } from '@/app/lib/todo-helpers';
import { 
  INSERT_TODO_COMMAND,
  INSERT_DOING_TODO_COMMAND,
  INSERT_NOW_TODO_COMMAND,
  INSERT_LATER_TODO_COMMAND,
  TOGGLE_TODO_STATUS_COMMAND,
  TOGGLE_TODO_DONE_COMMAND,
  REMOVE_TODO_COMMAND
} from '@/app/lib/todo-commands';

/*

this might be helpful for handling clicks on the status node

<NodeEventPlugin
nodeType={...}
eventType="click"
eventListener={(event: Event, editor: LexicalEditor, nodeKey: string) => {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);

    if ($isSomeNode(node)) {
      event.preventDefault();
      editor.dispatchCommand(...);
    }
  });
}}
/>
*/

function registerTodoCommands(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      INSERT_TODO_COMMAND,
      (node) => {
        const { listItem } = node;
        $wrapLIContentsWithTodo(listItem, "TODO");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_DOING_TODO_COMMAND,
      (node) => {
        const { listItem } = node;
        $wrapLIContentsWithTodo(listItem, "DOING");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_NOW_TODO_COMMAND,
      (node) => {
        const { listItem } = node;
        $wrapLIContentsWithTodo(listItem, "NOW");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      INSERT_LATER_TODO_COMMAND,
      (node) => {
        const { listItem } = node;
        $wrapLIContentsWithTodo(listItem, "LATER");
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      TOGGLE_TODO_STATUS_COMMAND,
      (node) => {
        const { todo } = node;
        $toggleTodoStatus(todo);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      TOGGLE_TODO_DONE_COMMAND,
      (node) => {
        const { todo } = node;
        $toggleTodoDone(todo);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      REMOVE_TODO_COMMAND,
      (node) => {
        const { listItem } = node;
        $unwrapTodoContents(listItem);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    )
  );
}

export function TodoPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([TodoNode, TodoStatusNode, TodoCheckboxNode])) {
      throw new Error('TodoPlugin: TodoNode not registered on editor');
    }
    return registerTodoCommands(editor);
  }, [editor]);

  return null;
}