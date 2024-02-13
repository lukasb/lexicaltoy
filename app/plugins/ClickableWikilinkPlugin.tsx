/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { $isWikilinkNode } from "../nodes/WikilinkNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  getNearestEditorFromDOMNode,
} from "lexical";
import { useEffect } from "react";

export default function ClickableWikilinkPlugin({
  newTab = true,
  openOrCreatePageByTitle,
}: {
  newTab?: boolean;
  openOrCreatePageByTitle?: (title: string) => void;
}): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const nearestEditor = getNearestEditorFromDOMNode(target);

      if (nearestEditor === null) {
        return;
      }

      let pageTitle = null;
      nearestEditor.update(() => {
        const clickedNode = $getNearestNodeFromDOMNode(target);
        if (clickedNode !== null) {
          if ($isWikilinkNode(clickedNode)) {
            pageTitle = clickedNode.getTextContent().slice(2, -2);
          } else {
            const maybeWikilinkNode = $findMatchingParent(
              clickedNode,
              $isElementNode
            );
            if ($isWikilinkNode(maybeWikilinkNode)) {
              const fullText = maybeWikilinkNode.getTextContent();
              // Remove the [[ and ]] from the text
              pageTitle = fullText.slice(2, -2);
            }
          }
        }
      });

      if (pageTitle === null || pageTitle === "") {
        return;
      }

      // Allow user to select link text without follwing url
      const selection = editor.getEditorState().read($getSelection);
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        event.preventDefault();
        return;
      }

      openOrCreatePageByTitle?.(pageTitle);
      event.preventDefault();
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 1 && editor.isEditable()) {
        onClick(event);
      }
    };

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement !== null) {
        prevRootElement.removeEventListener("click", onClick);
        prevRootElement.removeEventListener("mouseup", onMouseUp);
      }
      if (rootElement !== null) {
        rootElement.addEventListener("click", onClick);
        rootElement.addEventListener("mouseup", onMouseUp);
      }
    });
  }, [editor, newTab]);

  return null;
}
