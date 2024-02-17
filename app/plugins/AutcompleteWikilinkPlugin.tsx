/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {BaseSelection, NodeKey} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isAtNodeEnd} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useRef } from 'react';

import {useSharedAutocompleteContext} from '../context/SharedAutocompleteContext';
import {
  $createWikilinkAutocompleteNode,
  WikilinkAutocompleteNode,
} from '../nodes/WikilinkAutcompleteNode';
import {addSwipeRightListener} from '../utils/swipe';

type SearchPromise = {
  dismiss: () => void;
  promise: Promise<null | string>;
};

export const uuid = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, '')
  .substr(0, 5);

// TODO lookup should be custom
function $search(selection: null | BaseSelection): [boolean, string] {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return [false, ''];
  }
  const node = selection.getNodes()[0];
  const anchor = selection.anchor;
  // Check siblings?
  if (!$isTextNode(node) || !node.isSimpleText() || !$isAtNodeEnd(anchor)) {
    return [false, ''];
  }
  const word = [];
  const text = node.getTextContent();
  let i = node.getTextContentSize();
  let c;
  while (i-- && i >= 0 && (c = text[i]) !== ' ') {
    word.push(c);
  }
  if (word.length === 0) {
    return [false, ''];
  }
  return [true, word.reverse().join('')];
}

export default function AutocompleteWikilinkPlugin({pageTitles} : {pageTitles: string[]}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [, setSuggestion] = useSharedAutocompleteContext();

  const pageTitlesRef = useRef(pageTitles);

  useEffect(() => {
    pageTitlesRef.current = pageTitles;
  }, [pageTitles]);

  const query = useCallback((searchText: string) => {
    const server = new AutocompleteServer(pageTitlesRef.current);
    console.time('query');
    const response = server.query(searchText);
    console.timeEnd('query');
    return response;
  }, []);

  useEffect(() => {
    let autocompleteNodeKey: null | NodeKey = null;
    let lastMatch: null | string = null;
    let lastSuggestion: null | string = null;
    let searchPromise: null | SearchPromise = null;
    function $clearSuggestion() {
      const autocompleteNode =
        autocompleteNodeKey !== null
          ? $getNodeByKey(autocompleteNodeKey)
          : null;
      if (autocompleteNode !== null && autocompleteNode.isAttached()) {
        autocompleteNode.remove();
        autocompleteNodeKey = null;
      }
      if (searchPromise !== null) {
        searchPromise.dismiss();
        searchPromise = null;
      }
      lastMatch = null;
      lastSuggestion = null;
      setSuggestion(null);
    }
    function updateAsyncSuggestion(
      refSearchPromise: SearchPromise,
      newSuggestion: null | string,
    ) {
      if (searchPromise !== refSearchPromise || newSuggestion === null) {
        // Outdated or no suggestion
        return;
      }
      editor.update(
        () => {
          const selection = $getSelection();
          const [hasMatch, match] = $search(selection);
          if (
            !hasMatch ||
            match !== lastMatch ||
            !$isRangeSelection(selection)
          ) {
            // Outdated
            return;
          }
          const selectionCopy = selection.clone();
          const node = $createWikilinkAutocompleteNode(uuid);
          autocompleteNodeKey = node.getKey();
          selection.insertNodes([node]);
          $setSelection(selectionCopy);
          lastSuggestion = newSuggestion;
          setSuggestion(newSuggestion);
        },
        {tag: 'history-merge'},
      );
    }

    function handleAutocompleteNodeTransform(node: WikilinkAutocompleteNode) {
      const key = node.getKey();
      if (node.__uuid === uuid && key !== autocompleteNodeKey) {
        // Max one Autocomplete node per session
        $clearSuggestion();
      }
    }
    function handleUpdate() {
      editor.update(() => {
        const selection = $getSelection();
        const [hasMatch, match] = $search(selection);
        if (!hasMatch) {
          $clearSuggestion();
          return;
        }
        if (match === lastMatch) {
          return;
        }
        $clearSuggestion();
        searchPromise = query(match);
        searchPromise.promise
          .then((newSuggestion) => {
            if (searchPromise !== null) {
              updateAsyncSuggestion(searchPromise, newSuggestion);
            }
          })
          .catch((e) => {
            console.error(e);
          });
        lastMatch = match;
      });
    }
    function $handleAutocompleteIntent(): boolean {
      if (lastSuggestion === null || autocompleteNodeKey === null) {
        return false;
      }
      const autocompleteNode = $getNodeByKey(autocompleteNodeKey);
      if (autocompleteNode === null) {
        return false;
      }
      const textNode = $createTextNode(lastSuggestion);
      autocompleteNode.replace(textNode);
      textNode.selectNext();
      $clearSuggestion();
      return true;
    }
    function $handleKeypressCommand(e: Event) {
      if ($handleAutocompleteIntent()) {
        e.preventDefault();
        return true;
      }
      return false;
    }
    function handleSwipeRight(_force: number, e: TouchEvent) {
      editor.update(() => {
        if ($handleAutocompleteIntent()) {
          e.preventDefault();
        }
      });
    }
    function unmountSuggestion() {
      editor.update(() => {
        $clearSuggestion();
      });
    }

    const rootElem = editor.getRootElement();

    return mergeRegister(
      editor.registerNodeTransform(
        WikilinkAutocompleteNode,
        handleAutocompleteNodeTransform,
      ),
      editor.registerUpdateListener(
        handleUpdate
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        $handleKeypressCommand,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        $handleKeypressCommand,
        COMMAND_PRIORITY_LOW,
      ),
      ...(rootElem !== null
        ? [addSwipeRightListener(rootElem, handleSwipeRight)]
        : []),
      unmountSuggestion,
    );
  }, [editor, query, setSuggestion]);

  return null;
}

/*
 * Simulate an asynchronous autocomplete server (typical in more common use cases like GMail where
 * the data is not static).
 */
class AutocompleteServer {
  pageTitles: string[];
  LATENCY = 200;

  constructor(pageTitles: string[]) {
    this.pageTitles = pageTitles;
  }
  query = (searchText: string): SearchPromise => {
    let isDismissed = false;

    const dismiss = () => {
      isDismissed = true;
    };
    const promise: Promise<null | string> = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (isDismissed) {
          // TODO cache result
          // TODO maybe don't do this which ends up logging an error to the console?
          return reject('Dismissed');
        }
        const searchTextLength = searchText.length;
        if (searchText === '' || searchTextLength < 3) {
          return resolve(null);
        }
        if (searchText.startsWith('[[') || searchText.endsWith(']')) {
          return resolve(null);
        }
        const potentialTitle = searchText.substring(2);
        const match = this.pageTitles.find(
          (pageTitle) => pageTitle.toLowerCase().startsWith(potentialTitle.toLowerCase())
        );        
        if (match === undefined) {
          return resolve(null);
        }
        const autocompleteChunk = match.substring(potentialTitle.length);
        if (autocompleteChunk === '') {
          return resolve(null);
        }
        return resolve(autocompleteChunk);
      }, this.LATENCY);
    });

    return {
      dismiss,
      promise,
    };
  };
}