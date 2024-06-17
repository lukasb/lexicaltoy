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

  useEffect(() => {
      editor.focus(
        () => {
          const activeElement = document.activeElement;
          const rootElement = editor.getRootElement() as HTMLDivElement;
          if (rootElement !== null) {
            if (activeElement === null || !rootElement.contains(activeElement))
            {
              rootElement.focus({preventScroll: false});
            }
            // very long pages don't scroll to the end without this delay ;_;
            setTimeout(() => {
              rootElement.scrollIntoView({block: 'end', behavior: 'auto', inline: 'nearest'});
            }, 25);
          }
        },
        {defaultSelection},
      );
  }, [defaultSelection, editor]);

  return null;
}