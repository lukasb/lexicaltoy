import { LexicalCommand, createCommand } from "lexical";
import { BaseSelection } from "lexical";
import { TodoNode } from "@/app/nodes/TodoNode";

export const INSERT_TODO_COMMAND: LexicalCommand <{selection: BaseSelection}> = createCommand('INSERT_TODO_COMMAND');
export const INSERT_DOING_TODO_COMMAND: LexicalCommand <{selection: BaseSelection}> = createCommand('INSERT_DOING_TODO_COMMAND');
export const INSERT_NOW_TODO_COMMAND: LexicalCommand <{selection: BaseSelection}> = createCommand('INSERT_NOW_TODO_COMMAND');
export const INSERT_LATER_TODO_COMMAND: LexicalCommand <{selection: BaseSelection}> = createCommand('INSERT_LATER_TODO_COMMAND');
export const REMOVE_TODO_COMMAND: LexicalCommand <{selection: BaseSelection}> = createCommand('REMOVE_TODO_COMMAND');

export const TOGGLE_TODO_STATUS_COMMAND: LexicalCommand <{todo: TodoNode}> = createCommand('TOGGLE_TODO_STATUS_COMMAND');
export const TOGGLE_TODO_DONE_COMMAND: LexicalCommand <{todo: TodoNode}> = createCommand('TOGGLE_TODO_DONE_COMMAND');
