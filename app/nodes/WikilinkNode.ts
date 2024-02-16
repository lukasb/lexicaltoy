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
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$applyNodeReplacement, ElementNode} from 'lexical';

export type SerializedWikilinkNode = Spread<
  {
    pageTitle: string;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class WikilinkNode extends ElementNode {
  
  __pageTitle: string;

  static getType(): string {
    return 'wikilink';
  }

  static clone(node: WikilinkNode): WikilinkNode {
    return new WikilinkNode(node.__pageTitle, node.__key);
  }

  constructor(pageTitle: string, key?: NodeKey) {
    super(key);
    this.__pageTitle = pageTitle;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    // create a parent span element for the wikilink
    const element = document.createElement('span');
    
    const openingBracket = document.createElement('span');
    openingBracket.textContent = '[[';
    addClassNamesToElement(openingBracket, config.theme.wikilinkBracket);
    element.appendChild(openingBracket);

    const pageTitleSpan = document.createElement('span');
    pageTitleSpan.textContent = this.__pageTitle;
    addClassNamesToElement(pageTitleSpan, config.theme.wikilinkPageTitle);
    element.appendChild(pageTitleSpan);

    const closingBracket = document.createElement('span');
    closingBracket.textContent = '[[';
    addClassNamesToElement(closingBracket, config.theme.wikilinkBracket);
    element.appendChild(closingBracket);

    return element;
  }

  static importJSON(serializedNode: SerializedWikilinkNode): WikilinkNode {
    const node = $createWikilinkNode(serializedNode.pageTitle);
    return node;
  }

  exportJSON(): SerializedWikilinkNode {
    return {
      ...super.exportJSON(),
      pageTitle: this.__pageTitle,
      type: 'wikilink',
      version: 1
    };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  isTextEntity(): true {
    return true;
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
