import { useState, useRef } from 'react';
import { TodoStatus } from '@/_app/nodes/TodoNode';
import { 
  SET_TODO_DONE_VALUE_COMMAND,
  SET_TODO_STATUS_COMMAND
 } from '@/lib/todo-commands';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

const TodoDoneCheckboxClass = "PlaygroundEditorTheme__todoDone";

export default function TodoCheckboxStatusComponent(
  { todoStatus,
    todoDone, 
    nodeKey 
  }: 
  {
    todoStatus: TodoStatus,
    todoDone: boolean,
    nodeKey: string
  }
): JSX.Element {
  const [isChecked, setIsChecked] = useState<boolean>(todoDone);
  const [status, setStatus] = useState<TodoStatus>(todoStatus);
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
    editor.dispatchCommand(
      SET_TODO_DONE_VALUE_COMMAND,
      {
        done: e.target.checked,
        todoNodeKey: nodeKey
      });
      if (inputRef.current) {
        if (e.target.checked) {
          inputRef.current.classList.add(TodoDoneCheckboxClass);
        } else {
          inputRef.current.classList.remove(TodoDoneCheckboxClass);
        }
      } 
  };

  const handleStatusClick = () => {
    let newStatus = status;
    switch (status) {
      case "TODO":
        newStatus = TodoStatus.DOING;
        break;
      case "DOING":
        newStatus = TodoStatus.TODO;
        break;
      case "NOW":
        newStatus = TodoStatus.LATER;
        break;
      case "LATER":
        newStatus = TodoStatus.WAITING;
        break;
      case "WAITING":
        newStatus = TodoStatus.NOW;
        break;
      default:
        break;
    }
    setStatus(newStatus);
    editor.dispatchCommand(
      SET_TODO_STATUS_COMMAND,
      {
        status: newStatus,
        todoNodeKey: nodeKey
      });
  };

  return (
    <div className="inline-flex items-baseline">
      <input
        ref={inputRef}
        type="checkbox"
        checked={isChecked}
        className="mr-2 PlaygroundEditorTheme__todoCheckbox"
        onChange={handleCheckboxChange}
      />
        <div 
          className="text-sm font-semibold text-indigo-400 cursor-pointer PlaygroundEditorTheme__todoStatus"
          onClick={handleStatusClick}
        >
          {!isChecked ? `${status}  ` : ' '}
        </div>
    </div>
  );
}
