import { useState } from 'react';
import { TodoStatus } from '@/app/nodes/TodoNode';
import { 
  SET_TODO_DONE_VALUE_COMMAND,
  SET_TODO_STATUS_COMMAND
 } from '../lib/todo-commands';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export default function TodoCheckboxStatusComponent(
  { todoStatus,
    todoDone, 
    nodeKey 
  }: 
  {
    todoStatus: TodoStatus,
    todoDone: boolean
    nodeKey: string
  }
): JSX.Element {
  const [isChecked, setIsChecked] = useState<boolean>(todoDone);
  const [status, setStatus] = useState<TodoStatus>(todoStatus);
  const [editor] = useLexicalComposerContext();

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
    editor.dispatchCommand(
      SET_TODO_DONE_VALUE_COMMAND,
      {
        done: e.target.checked,
        todoNodeKey: nodeKey
      }); 
  };

  const handleStatusClick = () => {
    let newStatus = status;
    switch (status) {
      case "TODO":
        newStatus = "DOING";
        break;
      case "DOING":
        newStatus = "TODO";
        break;
      case "NOW":
        newStatus = "LATER";
        break;
      case "LATER":
        newStatus = "NOW";
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
    <div className="inline-flex">
      <input
        type="checkbox"
        checked={isChecked}
        className="mr-2"
        onChange={handleCheckboxChange}
      />
      {!isChecked && (
        <div 
          className="mr-2 text-sm font-semibold text-indigo-400 cursor-pointer"
          onClick={handleStatusClick}
        >
          {status}
        </div>
      )}
    </div>
  );
}
