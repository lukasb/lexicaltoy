import { LexicalCommand, createCommand } from "lexical";

export const SWAP_FORMULA_DISPLAY_FOR_EDITOR: LexicalCommand <{displayNodeKey: string}> = createCommand('SWAP_FORMULA_DISPLAY_FOR_EDITOR');