/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Spread} from 'lexical';

import {
  DecoratorNode,
  EditorConfig,
  NodeKey,
  SerializedLexicalNode,
} from 'lexical';
import * as React from 'react';
import {addClassNamesToElement} from '@lexical/utils';

import {useSharedAutocompleteContext} from '../context/SharedAutocompleteContext';
import {uuid as UUID} from '../plugins/AutcompleteWikilinkPlugin';

declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
    };
  }
}

export type SerializedAutocompleteNode = Spread<
  {
    uuid: string;
  },
  SerializedLexicalNode
>;

export class WikilinkAutocompleteNode extends DecoratorNode<JSX.Element | null> {
  // TODO add comment
  __uuid: string;

  static clone(node: WikilinkAutocompleteNode): WikilinkAutocompleteNode {
    return new WikilinkAutocompleteNode(node.__uuid, node.__key);
  }

  static getType(): 'wikilinkautocomplete' {
    return 'wikilinkautocomplete';
  }

  static importJSON(serializedNode: SerializedAutocompleteNode,
  ): WikilinkAutocompleteNode {
    const node = $createWikilinkAutocompleteNode(serializedNode.uuid);
    return node;
  }

  exportJSON(): SerializedAutocompleteNode {
    return {
      type: 'wikilinkautocomplete',
      uuid: this.__uuid,
      version: 1,
    };
  }

  constructor(uuid: string, key?: NodeKey) {
    super(key);
    this.__uuid = uuid;
  }

  updateDOM(
    prevNode: unknown,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    return false;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('span');
    addClassNamesToElement(element, config.theme.wikilinkAutocomplete);
    return element;
  }

  decorate(): JSX.Element | null {
    if (this.__uuid !== UUID) {
      return null;
    }
    return <WikilinkAutocompleteComponent />;
  }
}

export function $createWikilinkAutocompleteNode(uuid: string): WikilinkAutocompleteNode {
  return new WikilinkAutocompleteNode(uuid);
}

function WikilinkAutocompleteComponent(): JSX.Element {
  const [suggestion] = useSharedAutocompleteContext();
  const userAgentData = window.navigator.userAgentData;
  const isMobile =
    userAgentData !== undefined
      ? userAgentData.mobile
      : window.innerWidth <= 800 && window.innerHeight <= 600;
  // TODO Move to theme
  return (
    <span spellCheck="false">
      {suggestion}
    </span>
  );
}
