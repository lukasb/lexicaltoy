"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import React, { useEffect, useState } from "react";
import { useContext, useCallback } from "react";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { EditorState } from "lexical";
import { TextNode } from 'lexical';
import { AutoFocusPlugin } from "@/app/plugins/MyAutoFocusPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { 
  UNORDERED_LIST,
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS
} from "@lexical/markdown";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { KeyboardShortcutsPlugin } from "../plugins/KeyboardShortcutsPlugin";
import DraggableBlockPlugin from "../plugins/DraggableBlockPlugin";
import { useDebouncedCallback } from "use-debounce";
import { theme } from "./editor-theme";
import { FloatingMenuPlugin } from "../plugins/FloatingMenuPlugin";
import { useBreakpoint } from "../lib/window-helpers";
import { ListCommandsPlugin } from "../plugins/ListCommandsPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import TreeViewPlugin from "../plugins/TreeViewPlugin/TreeViewPlugin";
import { AutoLinkPlugin } from "../plugins/AutoLinkPlugin";
import LexicalClickableLinkPlugin from "@lexical/react/LexicalClickableLinkPlugin";
import { WikilinkNode, WikilinkInternalNode } from "../nodes/WikilinkNode";
import { WikilinkPlugin } from "../plugins/WikilinkPlugin";
import WikilinkEventListenerPlugin from "../plugins/WikilinkEventListenerPlugin";
import FloatingIndentButtons from '../plugins/FloatingMenuPlugin/FloatingIndentButtons';
import { shouldShowFloatingIndentButtons, computeFloatingIndentButtonsPosition } from "../plugins/FloatingMenuPlugin/FloatingIndentButtons";
import FloatingWikiPageNames from "../plugins/FloatingMenuPlugin/FloatingWikiPageNames";
import { shouldShowFloatingWikiPageNames, computeFloatingWikiPageNamesPosition } from "../plugins/FloatingMenuPlugin/FloatingWikiPageNames";
import { Page } from "@/app/lib/definitions";
import { PagesContext } from "@/app/context/pages-context";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TodoCheckboxStatusNode } from "@/app/nodes/TodoNode";
import { TodosPlugin } from "@/app/plugins/TodosPlugin";
import FloatingSlashCommands from '../plugins/FloatingMenuPlugin/FloatingSlashCommands';
import { shouldShowFloatingSlashCommands, computeFloatingSlashCommandsPosition } from "../plugins/FloatingMenuPlugin/FloatingSlashCommands";
import { FormulaEditorNode, FormulaDisplayNode } from "@/app/nodes/FormulaNode";
import { FormulaPlugin } from "@/app/plugins/FormulaPlugin";
import { PromisesProvider } from "../context/formula-request-context";
import { stripSharedNodesFromMarkdown } from "@/app/lib/formula/formula-markdown-converters";
import { PageListenerPlugin } from "../plugins/PageListenerPlugin";
import { FormattableTextNode } from "../nodes/FormattableTextNode";

function onError(error: Error) {
  console.error("Editor error:", error);
}

function Editor({
  page,
  showDebugInfo,
  requestFocus,
  updatePageContentsLocal,
  openOrCreatePageByTitle,
}: {
  page: Page;
  showDebugInfo: boolean;
  requestFocus: boolean;
  updatePageContentsLocal: (id: string, newValue: string, revisionNumber: number) => void;
  openOrCreatePageByTitle: (title: string) => void;
}) {

  const initialConfig = {
    editorState: () => $convertFromMarkdownString(page.value, TRANSFORMERS),
    namespace: "orangetask",
    theme,
    nodes: [
      LinkNode,
      ListNode,
      ListItemNode,
      AutoLinkNode,
      WikilinkNode,
      WikilinkInternalNode,
      TodoCheckboxStatusNode,
      FormulaEditorNode,
      FormulaDisplayNode,
      FormattableTextNode,
      {
        replace: TextNode,
        with: (node: TextNode) => new FormattableTextNode(node.__text)
      }
    ],
    onError,
  };

  const pages = useContext(PagesContext);

  const getPage = useCallback((id: string) => {
    return pages.find((page) => page.id === id);
  }, [pages]);

  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);

  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState<boolean>(false);

  useBreakpoint(768, isSmallWidthViewport, setIsSmallWidthViewport);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  let localVersion = page.revisionNumber;

  // TODO this assumes the page content won't be changed elsewhere in the same PagesContext
  const storePage = useDebouncedCallback(async (outline) => {
    const currentPage = getPage(page.id);
    if (!currentPage || localVersion > currentPage.revisionNumber) {
      console.log("Local version is newer than current page version, not saving.");
      return;
    }
    updatePageContentsLocal(page.id, outline, currentPage.revisionNumber);
    localVersion = currentPage.revisionNumber + 1;
  }, 500);

  function onChange(editorState: EditorState) {
    if (!editorState) return;
    editorState.read(() => {
      const editorStateMarkdown = $convertToMarkdownString(TRANSFORMERS);
      const pageContentsWithoutSharedNodes = stripSharedNodesFromMarkdown(editorStateMarkdown);
      const trimmedPageContents = pageContentsWithoutSharedNodes.replace(/\s$/, '');
      const trimmedPageValue = page.value.replace(/\s$/, '');
      if (trimmedPageContents !== trimmedPageValue) {
        storePage(pageContentsWithoutSharedNodes);
      }
    });
  }

  return (
    <PromisesProvider>
      <LexicalComposer initialConfig={initialConfig}>
        {requestFocus && <AutoFocusPlugin/>}
        <RichTextPlugin
          contentEditable={
            <div ref={onRef} className="relative">
              <ContentEditable className="w-full outline-none" />
            </div>
          }
          // absolute positioning is the Lexical team's official recommendation for placeholders
          placeholder={<div className="absolute top-10 left-10"></div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <OnChangePlugin onChange={onChange} ignoreSelectionChange={true} />
        <PageListenerPlugin pageId={page.id} />
        <MarkdownShortcutPlugin transformers={[UNORDERED_LIST]} />
        <KeyboardShortcutsPlugin />
        <ListCommandsPlugin />
        <HistoryPlugin />
        <AutoLinkPlugin />
        <LexicalClickableLinkPlugin />
        <FormulaPlugin />
        <TodosPlugin />
        <WikilinkPlugin />
        <WikilinkEventListenerPlugin
          openOrCreatePageByTitle={openOrCreatePageByTitle}
        />
        {floatingAnchorElem && !isSmallWidthViewport && (
          <>
            <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
            <FloatingMenuPlugin
              anchorElem={floatingAnchorElem}
              menuConfig={[
                {
                  component: FloatingWikiPageNames,
                  shouldShow: shouldShowFloatingWikiPageNames,
                  computePosition: computeFloatingWikiPageNamesPosition,
                  priority: 20,
                },
                {
                  component: FloatingSlashCommands,
                  shouldShow: shouldShowFloatingSlashCommands,
                  computePosition: computeFloatingSlashCommandsPosition,
                  priority: 30,
                },
              ]}
            />
          </>
        )}
        {floatingAnchorElem && isSmallWidthViewport && (
          <>
            <FloatingMenuPlugin
              anchorElem={floatingAnchorElem}
              menuConfig={[
                {
                  component: FloatingIndentButtons,
                  shouldShow: shouldShowFloatingIndentButtons,
                  computePositionAsync: computeFloatingIndentButtonsPosition,
                  priority: 10,
                },
                {
                  component: FloatingWikiPageNames,
                  shouldShow: shouldShowFloatingWikiPageNames,
                  computePosition: computeFloatingWikiPageNamesPosition,
                  priority: 20,
                },
                {
                  component: FloatingSlashCommands,
                  shouldShow: shouldShowFloatingSlashCommands,
                  computePosition: computeFloatingSlashCommandsPosition,
                  priority: 30,
                },
              ]}
            />
          </>
        )}
        {showDebugInfo && <TreeViewPlugin />}
      </LexicalComposer>
    </PromisesProvider>
  );
}

export default Editor;
