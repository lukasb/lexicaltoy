/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createTodoNode, TodoNode, TodoStatus
} from '@/app/nodes/TodoNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalTodoEntity} from '@/app/lib/todo-helpers';
import {useCallback, useEffect} from 'react';

function getTodoRegexString(): string {
  return '^(TODO|DONE|NOW|LATER|DOING) .*';
}

const REGEX = new RegExp(getTodoRegexString(), 'i');

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

export function TodoPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TodoNode])) {
      throw new Error('TodoPlugin: TodoNode not registered on editor');
    }
  }, [editor]);

  // TODO - maybe make a generic class that handles useLexicalElementEntity and useLexicalTodoEntity
  // then put all the creation logic in here
  // dunno though, might be hard
  const createTodoNode = useCallback((): TodoNode => {
    return $createTodoNode();
  }, []);

  const getTodoMatch = useCallback((text: string) => {
    const matchArr = REGEX.exec(text);

    if (matchArr === null) {
      return null;
    }
    
    return matchArr[1] as TodoStatus;
  }, []);

  useLexicalTodoEntity<TodoNode>(
    getTodoMatch,
    TodoNode,
    createTodoNode,
  );

  return null;
}