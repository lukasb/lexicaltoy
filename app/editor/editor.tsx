"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import React, { useEffect, useState } from "react";
import { useContext, useCallback } from "react";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { EditorState } from "lexical";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { UNORDERED_LIST } from "@lexical/markdown";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { KeyboardShortcutsPlugin } from "../plugins/KeyboardShortcutsPlugin";
import DraggableBlockPlugin from "../plugins/DraggableBlockPlugin";
import { useDebouncedCallback } from "use-debounce";
import { updatePageContentsWithHistory } from "../lib/actions";
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

function onError(error: Error) {
  console.error("Editor error:", error);
}

function Editor({
  page,
  showDebugInfo,
  updatePageContentsLocal,
  openOrCreatePageByTitle,
}: {
  page: Page;
  showDebugInfo: boolean;
  updatePageContentsLocal: (id: string, newValue: string, revisionNumber: number) => void;
  openOrCreatePageByTitle: (title: string) => void;
}) {
  const initialConfig = {
    editorState: page.value,
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

  // TODO this assumes the page content won't be changed elsewhere in the same PagesContext
  const storePage = useDebouncedCallback(async (outline) => {
    console.log("Storing page");
    const currentPage = getPage(page.id);
    if (!currentPage) return;
    try {
      const newRevisionNumber = await updatePageContentsWithHistory(page.id, outline, currentPage.revisionNumber);
      if (newRevisionNumber === -1) {
        alert("Failed to save page because you edited an old version, please relead for the latest version.");
        return;
      }
      updatePageContentsLocal(page.id, outline, newRevisionNumber);
    } catch (error) {
      alert("Failed to save page");
    }
  }, 500);

  function onChange(editorState: EditorState) {
    if (!editorState) return;
    const editorStateJSONString = JSON.stringify(editorState);
    storePage(editorStateJSONString);
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <AutoFocusPlugin />
      <RichTextPlugin
        contentEditable={
          <div ref={onRef} className="relative">
            <ContentEditable className="w-full outline-none" />
          </div>
        }
        // absolute positioning is the Lexical team's official recommendation for placeholders
        placeholder={
          <div className="absolute top-10 left-10"></div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ListPlugin />
      <OnChangePlugin onChange={onChange} ignoreSelectionChange={true} />
      <MarkdownShortcutPlugin transformers={[UNORDERED_LIST]} />
      <KeyboardShortcutsPlugin />
      <ListCommandsPlugin />
      <HistoryPlugin />
      <AutoLinkPlugin />
      <LexicalClickableLinkPlugin />
      <WikilinkPlugin />
      <WikilinkEventListenerPlugin openOrCreatePageByTitle={openOrCreatePageByTitle} />
      <TodosPlugin />
      <FormulaPlugin />
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
                priority: 20
              },
              {
                component: FloatingSlashCommands,
                shouldShow: shouldShowFloatingSlashCommands,
                computePosition: computeFloatingSlashCommandsPosition,
                priority: 30
              }
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
                computePosition: computeFloatingIndentButtonsPosition,
                priority: 10
              },
              {
                component: FloatingWikiPageNames,
                shouldShow: shouldShowFloatingWikiPageNames,
                computePosition: computeFloatingWikiPageNamesPosition,
                priority: 20
              },
              {
                component: FloatingSlashCommands,
                shouldShow: shouldShowFloatingSlashCommands,
                computePosition: computeFloatingSlashCommandsPosition,
                priority: 30
              }
            ]}
          />
        </>
      )}
      {showDebugInfo && <TreeViewPlugin />}
    </LexicalComposer>
  );
}

export default Editor;
