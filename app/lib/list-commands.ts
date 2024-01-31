import { ListItemNode } from "@lexical/list";
import { LexicalCommand, createCommand } from "lexical";

export const DELETE_LISTITEM_COMMAND: LexicalCommand <{listItem: ListItemNode}> = createCommand('DELETE_LISTITEM_COMMAND');
export const MOVE_LISTITEM_UP_COMMAND: LexicalCommand <{listItem: ListItemNode}> = createCommand('MOVE_LISTITEM_UP_COMMAND');
export const MOVE_LISTITEM_DOWN_COMMAND: LexicalCommand <{listItem: ListItemNode}> = createCommand('MOVE_LISTITEM_DOWN_COMMAND');