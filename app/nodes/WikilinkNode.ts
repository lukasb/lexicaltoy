/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$applyNodeReplacement, TextNode} from 'lexical';

/** @noInheritDoc */
export class WikilinkNode extends TextNode {
  static getType(): string {
    return 'wikilink';
  }

  static clone(node: WikilinkNode): WikilinkNode {
    return new WikilinkNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.wikilink);
    return element;
  }

  static importJSON(serializedNode: SerializedTextNode): WikilinkNode {
    const node = $createWikilinkNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'wikilink',
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
