/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TextNode} from 'lexical';

import {$createWikilinkNode, WikilinkNode} from '../nodes/WikilinkNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalTextEntity} from '@lexical/react/useLexicalTextEntity';
import {useCallback, useEffect} from 'react';

function getWikilinkRegexString(): string {
  const wikiLinkStartSequence = '\\[\\[';
  const wikiLinkEndSequence = '\]\]';

  // A wikilink looks like [[this]]
  // TODO check the inner text to make sure it's valid when
  // used as a filename or something
  const wikilink =
    '(' + wikiLinkStartSequence + ')' + 
    "([^\\[\\]]+)" + 
    '(' + wikiLinkEndSequence + ')';
    
  return wikilink;
}

const REGEX = new RegExp(getWikilinkRegexString(), 'i');

export function WikilinkPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([WikilinkNode])) {
      throw new Error('WikilinkPlugin: HashtagNode not registered on editor');
    }
  }, [editor]);

  const createWikilinkNode = useCallback((textNode: TextNode): WikilinkNode => {
    return $createWikilinkNode(textNode.getTextContent());
  }, []);

  const getWikilinkMatch = useCallback((text: string) => {
    const matchArr = REGEX.exec(text);

    if (matchArr === null) {
      return null;
    }

    const wikilinkLength = matchArr[2].length + 4;
    const startOffset = matchArr.index;
    const endOffset = startOffset + wikilinkLength;
    
    return {
      end: endOffset,
      start: startOffset,
    };
  }, []);

  useLexicalTextEntity<WikilinkNode>(
    getWikilinkMatch,
    WikilinkNode,
    createWikilinkNode,
  );

  return null;
}
