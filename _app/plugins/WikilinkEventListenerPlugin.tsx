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
  COMMAND_PRIORITY_NORMAL,
  getNearestEditorFromDOMNode
} from "lexical";
import { useEffect, useCallback } from "react";
import { mergeRegister } from "@lexical/utils";
import { KEY_DOWN_COMMAND } from "lexical";
import { useOpenWikilinkWithBlockId } from "../context/wikilink-blockid-context";
import { 
  getBlockReferenceFromMarkdown,
  stripBlockReference,
  $findNodeByBlockId,
 } from "../../lib/blockref";

function getPageTitleFromWikiLinkNode(node: any) {
  return node.getTextContent().slice(2, -2);
}

export default function WikilinkEventListenerPlugin({
  newTab = true,
  openOrCreatePageByTitle,
  thisPageTitle,
}: {
  newTab?: boolean;
  openOrCreatePageByTitle?: (title: string) => void;
  thisPageTitle: string;
}): null {
  const [editor] = useLexicalComposerContext();
  const { wikilinkWithBlockIdToOpen: wikilinkWithBlockId, setWikilinkWithBlockIdToOpen: setWikilinkWithBlockId } = useOpenWikilinkWithBlockId();

  const handleOpenWikilink = useCallback((pageTitle: string) => {
    const blockId = getBlockReferenceFromMarkdown(pageTitle);
    if (blockId) {
      openOrCreatePageByTitle?.(stripBlockReference(pageTitle));
      setWikilinkWithBlockId({
        pageName: stripBlockReference(pageTitle),
        blockId: blockId,
      });
    } else {
      openOrCreatePageByTitle?.(pageTitle);
    }
  }, [openOrCreatePageByTitle, setWikilinkWithBlockId]);

  useEffect(() => {
    if (wikilinkWithBlockId && wikilinkWithBlockId.pageName === thisPageTitle) {
      setWikilinkWithBlockId(null);
      const editorState = editor.getEditorState();
      editorState.read(() => {
        const blockNode = $findNodeByBlockId(wikilinkWithBlockId.blockId);
        if (blockNode) {
          const domNode = editor.getElementByKey(blockNode.getKey());
          if (domNode) {
            domNode.scrollIntoView({ behavior: 'instant', block: 'center' });
          } 
        }
      });
    }
  }, [wikilinkWithBlockId, thisPageTitle, setWikilinkWithBlockId, editor]);

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
              pageTitle = getPageTitleFromWikiLinkNode(maybeWikilinkNode);
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

      handleOpenWikilink(pageTitle);
      event.preventDefault();
    };

    function traverseUpToFindWikilinkNode(node: any): any {
      if (node === null) {
        return null;
      }
      if ($isWikilinkNode(node)) {
        return node;
      }
      return traverseUpToFindWikilinkNode(node.getParent());
    }

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 1 && editor.isEditable()) {
        onClick(event);
      }
    };

    const onMetaEnter = (event: KeyboardEvent): boolean => {
      const selection = editor.getEditorState().read($getSelection);
      if (selection && selection.isCollapsed()) {
        let pageTitle = null;
        const target = event.target;
        if (!(target instanceof Node)) {
          return false;
        }
        const nearestEditor = getNearestEditorFromDOMNode(target);
        if (nearestEditor === null) {
          return false;
        }
        nearestEditor.getEditorState().read(() => {
          const nodes = selection.getNodes();

          const wikilinkNode = traverseUpToFindWikilinkNode(nodes[0]);
          if (wikilinkNode) {
            pageTitle = getPageTitleFromWikiLinkNode(wikilinkNode);
          }
        });

        if (pageTitle === null || pageTitle === "") {
          return false;
        }

        handleOpenWikilink(pageTitle);
      }
      return true;
    };

    return mergeRegister(
      editor.registerRootListener((rootElement, prevRootElement) => {
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener("click", onClick);
          prevRootElement.removeEventListener("mouseup", onMouseUp);
        }
        if (rootElement !== null) {
          rootElement.addEventListener("click", onClick);
          rootElement.addEventListener("mouseup", onMouseUp);
        }
      }),
      editor.registerCommand<KeyboardEvent>(
        KEY_DOWN_COMMAND, // would prever to use KEY_ARROW_UP_COMMAND etc but those don't fire if ctrl is pressed
        (event) => {
          if (event.metaKey && event.key == "Enter") {
            return onMetaEnter(event);
          }
          return false;
        },
        COMMAND_PRIORITY_NORMAL
      )
    );
  }, [editor, newTab, openOrCreatePageByTitle, setWikilinkWithBlockId, handleOpenWikilink]);

  return null;
}
