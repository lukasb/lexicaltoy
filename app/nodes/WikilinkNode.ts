/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { Spread } from 'lexical';

import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  SerializedTextNode,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$applyNodeReplacement, ElementNode, TextNode, $createTextNode} from 'lexical';

export class WikilinkBracketNode extends TextNode {
  static getType(): string {
    return 'wikilinkBracket';
  }

  static clone(node: WikilinkBracketNode): WikilinkBracketNode {
    return new WikilinkBracketNode(node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'wikilinkBracket',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedTextNode): WikilinkBracketNode {
    return new WikilinkBracketNode(serializedNode.text);
  }

}

export type SerializedWikilinkNode = SerializedElementNode;

/** @noInheritDoc */
export class WikilinkNode extends ElementNode {

  static getType(): string {
    return 'wikilink';
  }

  static clone(node: WikilinkNode): WikilinkNode {
    return new WikilinkNode(node.__key);
  }

  // TODO how do I set styles on these?
  constructor(pageTitle: string, key?: NodeKey) {
    super(key);
    //this.append(new WikilinkBracketNode('[['));
    const openingBracket = $createTextNode('[[');
    openingBracket.setStyle("color: gray");
    this.append(openingBracket);
    const title = $createTextNode(pageTitle);
    title.setStyle("color: blue");
    this.append(title);
    const endBracket = $createTextNode(']]');
    endBracket.setStyle("color: gray");
    this.append(endBracket);
    //this.append(new WikilinkBracketNode(']]'));
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {

    // create a parent span element for the wikilink
    const element = document.createElement('span');
    
    /*
    const openingBracket = document.createElement('span');
    openingBracket.textContent = '[[';
    addClassNamesToElement(openingBracket, config.theme.wikilinkBracket);
    element.append(openingBracket);

    const pageTitleSpan = document.createElement('span');
    pageTitleSpan.textContent = this.__pageTitle;
    addClassNamesToElement(pageTitleSpan, config.theme.wikilinkPageTitle);
    element.append(pageTitleSpan);

    const closingBracket = document.createElement('span');
    closingBracket.textContent = ']]';
    addClassNamesToElement(closingBracket, config.theme.wikilinkBracket);
    element.append(closingBracket);
    */

    return element;
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, config: EditorConfig): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedWikilinkNode): WikilinkNode {
    const node = $createWikilinkNode();
    return node;
  }

  exportJSON(): SerializedWikilinkNode {
    return {
      ...super.exportJSON(),
      type: 'wikilink',
      version: 1
    };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
  
  isTextEntity(): boolean {
    return false;
  }
}

/**
 * Generates a WikilinkNode, which is a string following the format of [[text]].
 * @param text - The text used inside the WikilinkNode.
 * @returns - The WikilinkNode with the embedded text.
 */
export function $createWikilinkNode(text = ''): WikilinkNode {
  return $applyNodeReplacement(new WikilinkNode(text));
}

/**
 * Determines if node is a WikilinkNode.
 * @param node - The node to be checked.
 * @returns true if node is a WikilinkNode, false otherwise.
 */
export function $isWikilinkNode(
  node: LexicalNode | null | undefined,
): node is WikilinkNode {
  return node instanceof WikilinkNode;
}
