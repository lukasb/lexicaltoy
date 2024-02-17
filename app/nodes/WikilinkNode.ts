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

import {$applyNodeReplacement, ElementNode, TextNode, $createTextNode} from 'lexical';

export type SerializedWikilinkNode = SerializedElementNode;

export function $createWikilinkInternalNode(text: string): WikilinkInternalNode {
  return $applyNodeReplacement(new WikilinkInternalNode(text));
}

export class WikilinkInternalNode extends TextNode {
  static getType(): string {
    return 'wikilink-internal';
  }

  markDirty(): void {
    console.log("markDirty");
    super.markDirty();
    this.getParent().markDirty();
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'wikilink-internal',
      version: 1
    };
  }

}

/** @noInheritDoc */
export class WikilinkNode extends ElementNode {

  static getType(): string {
    return 'wikilink';
  }

  static clone(node: WikilinkNode): WikilinkNode {
    return new WikilinkNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {

    // create a parent span element for the wikilink
    const element = document.createElement('span');
    return element;
  }

  updateDOM(_prevNode: unknown, _dom: HTMLElement, config: EditorConfig): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedWikilinkNode): WikilinkNode {
    return super.importJSON(serializedNode) as WikilinkNode;
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
export function $createWikilinkNode(): WikilinkNode {
  return $applyNodeReplacement(new WikilinkNode());
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
