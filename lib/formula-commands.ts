import { LexicalCommand, createCommand } from "lexical";
import { BaseNodeMarkdown } from "./formula/formula-definitions";

export const SWAP_FORMULA_DISPLAY_FOR_EDITOR: LexicalCommand <{displayNodeKey: string}> = createCommand('SWAP_FORMULA_DISPLAY_FOR_EDITOR');
export const STORE_FORMULA_OUTPUT: LexicalCommand <{displayNodeKey: string, output: string}> = createCommand('STORE_FORMULA_OUTPUT');
export const CREATE_FORMULA_NODES: LexicalCommand <{displayNodeKey: string, nodesMarkdown: BaseNodeMarkdown[]}> = createCommand('CREATE_FORMULA_NODES');