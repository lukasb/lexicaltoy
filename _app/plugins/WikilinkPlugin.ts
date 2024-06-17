'use client';

import {$createWikilinkNode, WikilinkNode} from '../nodes/WikilinkNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalElementEntity} from '@/lib/transform-helpers';
import {useCallback, useEffect} from 'react';
import { WIKILINK_REGEX } from '@/lib/text-utils';

export function WikilinkPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([WikilinkNode])) {
      throw new Error('WikilinkPlugin: WikilinkNode not registered on editor');
    }
  }, [editor]);

  const createWikilinkNode = useCallback((): WikilinkNode => {
    return $createWikilinkNode();
  }, []);

  const getWikilinkMatch = useCallback((text: string) => {
    const matchArr = WIKILINK_REGEX.exec(text);

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

  useLexicalElementEntity<WikilinkNode>(
    getWikilinkMatch,
    WikilinkNode,
    createWikilinkNode,
  );

  return null;
}
