import { LexicalCommand, createCommand } from "lexical";
import { NodeElementMarkdown } from "./formula/formula-definitions";

export const SWAP_FORMULA_DISPLAY_FOR_EDITOR: LexicalCommand <{displayNodeKey: string}> = createCommand('SWAP_FORMULA_DISPLAY_FOR_EDITOR');
export const PUT_CURSOR_NEXT_TO_FORMULA_DISPLAY: LexicalCommand <{displayNodeKey: string}> = createCommand('PUT_CURSOR_NEXT_TO_FORMULA_DISPLAY');
export const SWAP_FORMULA_EDITOR_FOR_DISPLAY: LexicalCommand <{editorNodeKey: string}> = createCommand('SWAP_FORMULA_EDITOR_FOR_DISPLAY');
export const STORE_FORMULA_OUTPUT: LexicalCommand <{displayNodeKey: string, output: string}> = createCommand('STORE_FORMULA_OUTPUT');
export const CREATE_AND_STORE_FORMULA_OUTPUT: LexicalCommand <{displayNodeKey: string, output: string}> = createCommand('CREATE_AND_STORE_FORMULA_OUTPUT');
export const FLATTEN_FORMULA_OUTPUT: LexicalCommand <{displayNodeKey: string}> = createCommand('FLATTEN_FORMULA_OUTPUT');
export const CREATE_FORMULA_NODES: LexicalCommand <{displayNodeKey: string, nodesMarkdown: NodeElementMarkdown[]}> = createCommand('CREATE_FORMULA_NODES');
export const ADD_FORMULA_NODES: LexicalCommand <{displayNodeKey: string, nodesMarkdown: NodeElementMarkdown[]}> = createCommand('ADD_FORMULA_NODES');