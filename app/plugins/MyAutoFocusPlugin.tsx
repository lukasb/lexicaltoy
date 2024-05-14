/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

type Props = {
  defaultSelection?: 'rootStart' | 'rootEnd'
};

export function AutoFocusPlugin({defaultSelection}: Props): null {
  const [editor] = useLexicalComposerContext();

  // TODO we're using a timeout here, because otherwise when we have 2 columns
  // the focus was always set to the last page in the right column. however
  // we should probably do this by rendering the autofocus plugin at the end of the right column
  // and passing it a ref to the top left page

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      editor.focus(
        () => {
          const activeElement = document.activeElement;
          const rootElement = editor.getRootElement() as HTMLDivElement;
          if (
            rootElement !== null &&
            (activeElement === null || !rootElement.contains(activeElement))
          ) {
            rootElement.focus({preventScroll: true});
          }
        },
        {defaultSelection},
      );
    }, 50);
  
    // Clean up the timeout when the component unmounts or when the dependencies change
    return () => clearTimeout(timeoutId);
  }, [defaultSelection, editor]);

  return null;
}