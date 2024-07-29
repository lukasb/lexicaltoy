import { LexicalCommand, createCommand } from "lexical";
import { TodoStatus } from "@/_app/nodes/TodoNode";

export const INSERT_TODO_COMMAND: LexicalCommand<void> = createCommand('INSERT_TODO_COMMAND');
export const INSERT_DOING_TODO_COMMAND: LexicalCommand <void> = createCommand('INSERT_DOING_TODO_COMMAND');
export const INSERT_NOW_TODO_COMMAND: LexicalCommand <void> = createCommand('INSERT_NOW_TODO_COMMAND');
export const INSERT_LATER_TODO_COMMAND: LexicalCommand <void> = createCommand('INSERT_LATER_TODO_COMMAND');
export const INSERT_WAITING_TODO_COMMAND: LexicalCommand <void> = createCommand('INSERT_WAITING_TODO_COMMAND');
export const REMOVE_TODO_COMMAND: LexicalCommand <void> = createCommand('REMOVE_TODO_COMMAND');

export const SET_TODO_DONE_VALUE_COMMAND: LexicalCommand <{done: boolean, todoNodeKey: string}> = createCommand('TOGGLE_TODO_DONE_COMMAND');
export const SET_TODO_STATUS_COMMAND: LexicalCommand <{status: TodoStatus, todoNodeKey: string}> = createCommand('SET_TODO_STATUS_COMMAND');
