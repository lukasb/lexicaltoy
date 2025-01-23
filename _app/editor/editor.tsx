"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import React, { useRef, useState } from "react";
import { useContext, useCallback } from "react";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { EditorState } from "lexical";
import { AutoFocusPlugin } from "@/_app/plugins/MyAutoFocusPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { 
  UNORDERED_LIST,
  TRANSFORMERS
} from "@lexical/markdown";
import { $myConvertToMarkdownString } from "@/lib/markdown/markdown-export";
import { KeyboardShortcutsPlugin } from "@/_app/plugins/KeyboardShortcutsPlugin";
import { useDebouncedCallback } from "use-debounce";
import { theme } from "./editor-theme";
import { FloatingMenuPlugin } from "@/_app/plugins/FloatingMenuPlugin";
import { useBreakpoint } from "@/lib/window-helpers";
import { ListCommandsPlugin } from "@/_app/plugins/ListCommandsPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import TreeViewPlugin from "@/_app/plugins/TreeViewPlugin/TreeViewPlugin";
import { AutoLinkPlugin } from "@/_app/plugins/AutoLinkPlugin";
import LexicalClickableLinkPlugin from "@lexical/react/LexicalClickableLinkPlugin";
import { WikilinkPlugin } from "@/_app/plugins/WikilinkPlugin";
import WikilinkEventListenerPlugin from "@/_app/plugins/WikilinkEventListenerPlugin";
import FloatingIndentButtons from '@/_app/plugins/FloatingMenuPlugin/FloatingIndentButtons';
import { shouldShowFloatingIndentButtons, computeFloatingIndentButtonsPosition } from "@/_app/plugins/FloatingMenuPlugin/FloatingIndentButtons";
import FloatingWikiPageNames from "@/_app/plugins/FloatingMenuPlugin/FloatingWikiPageNames";
import { shouldShowFloatingWikiPageNames, computeFloatingWikiPageNamesPosition } from "@/_app/plugins/FloatingMenuPlugin/FloatingWikiPageNames";
import { Page, PageStatus } from "@/lib/definitions";
import { PagesContext } from "@/_app/context/pages-context";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TodosPlugin } from "@/_app/plugins/TodosPlugin";
import FloatingSlashCommands from '@/_app/plugins/FloatingMenuPlugin/FloatingSlashCommands';
import { shouldShowFloatingSlashCommands, computeFloatingSlashCommandsPosition } from "@/_app/plugins/FloatingMenuPlugin/FloatingSlashCommands";
import { FormulaPlugin } from "@/_app/plugins/FormulaPlugin";
import { PromisesProvider } from "@/_app/context/formula-request-context";
import { stripSharedNodesFromMarkdown } from "@/lib/formula/formula-markdown-converters";
import { PageListenerPlugin } from "@/_app/plugins/PageListenerPlugin";
import { $myConvertFromMarkdownString } from "@/lib/markdown/markdown-import";
import FloatingCheckmark from "../plugins/FloatingMenuPlugin/FloatingCheckmark";
import { shouldShowFloatingCheckmark, computeFloatingCheckmarkPosition } from "../plugins/FloatingMenuPlugin/FloatingCheckmark";
import { SearchHighlighterPlugin } from "@/_app/plugins/SearchHighlighterPlugin";
import { useSearchTerms } from "../context/search-terms-context";
import { AIGeneratorPlugin } from "../plugins/AIGeneratorPlugin";
import { editorNodes } from "./shared-editor-config";
import { useBlockIdsIndex, ingestPageBlockIds } from "@/_app/context/page-blockids-index-context";
import { usePageStatusStore } from "@/lib/stores/page-status-store";
import { TypingPerformancePlugin } from "../plugins/TypingPerformancePlugin";

function onError(error: Error) {
  console.log("🛑 Editor error:", error);
}

type EditorProps = {
  page: Page;
  showDebugInfo: boolean;
  requestFocus: boolean;
  openOrCreatePageByTitle: (title: string) => void;
  closePage: (id: string) => void;
};

function Editor({
  page,
  showDebugInfo,
  requestFocus,
  openOrCreatePageByTitle,
  closePage,
}: EditorProps) {

  const initialConfig = {
    editorState: () => $myConvertFromMarkdownString(page.value, false),
    namespace: "orangetask",
    theme,
    nodes: editorNodes,
    onError,
  };

  const pages = useContext(PagesContext);
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);
  const { getSearchTerms, deleteSearchTerms } = useSearchTerms();
  const [shouldHighlight, setShouldHighlight] = useState<boolean>(getSearchTerms(page.id).length > 0);
  const { setBlockIdsForPage } = useBlockIdsIndex();
  const { setPageStatus, getUpdatedPageValue, getPageStatus } = usePageStatusStore();

  const getPage = useCallback((id: string) => {
    return pages.find((page) => page.id === id);
  }, [pages]);

  useBreakpoint(768, isSmallWidthViewport, setIsSmallWidthViewport);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  const saveChange = useCallback(async (newContent: string) => {
    const currentPage = getPage(page.id);
    if (currentPage) {
      const currentStatus = getPageStatus(page.id);
      if (currentStatus?.status === PageStatus.Conflict) {
        console.log("conflict detected, not saving");
        return;
      }
      setPageStatus(
        page.id,
        PageStatus.UserEdit,
        new Date(new Date().toISOString()),
        currentStatus?.revisionNumber ?? page.revisionNumber,
        newContent
      );
      ingestPageBlockIds(page.title, newContent, setBlockIdsForPage);
    }
  }, [page.id, getPage, setBlockIdsForPage, page.title, setPageStatus, getPageStatus, page.revisionNumber]);

  const debouncedOnChange = useDebouncedCallback((editorState: EditorState) => {
    if (
      !editorState ||
      getPageStatus(page.id)?.status === PageStatus.EditFromSharedNodes ||
      getPageStatus(page.id)?.status === PageStatus.Conflict ||
      getPageStatus(page.id)?.status === PageStatus.DroppingUpdate ||
      getPageStatus(page.id)?.status === PageStatus.EditorUpdateRequested ||
      getPageStatus(page.id)?.status === PageStatus.UpdatedFromDisk
    ) {
      return;
    }
    editorState.read(() => {
      const localPageValue = getUpdatedPageValue(page);
      if (localPageValue === undefined) return;
      const trimmedPageValue = localPageValue.replace(/\s$/, '');

      const editorStateMarkdown = $myConvertToMarkdownString(undefined, undefined, true);
      const editoContentsWithoutSharedNodes = stripSharedNodesFromMarkdown(editorStateMarkdown);
      const trimmedEditorContents = editoContentsWithoutSharedNodes.replace(/\s$/, '');
      
      if (trimmedEditorContents !== trimmedPageValue) {
        saveChange(editoContentsWithoutSharedNodes);
        deleteSearchTerms(page.id);
      }
    });
  }, 300);

  const onChange = useCallback((editorState: EditorState) => {
    debouncedOnChange(editorState);
  }, [debouncedOnChange]);

  const onBeforeUnload = useCallback(() => {
    debouncedOnChange.flush();
  }, [debouncedOnChange]);

  React.useEffect(() => {
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      debouncedOnChange.flush();
    };
  }, [onBeforeUnload, debouncedOnChange]);

  return (
    <PromisesProvider>
      <LexicalComposer initialConfig={initialConfig}>
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
        <FormulaPlugin />
        <PageListenerPlugin pageId={page.id} />
        <MarkdownShortcutPlugin transformers={[UNORDERED_LIST]} />
        <KeyboardShortcutsPlugin closePage={() => closePage(page.id)} />
        <ListCommandsPlugin />
        <HistoryPlugin />
        <AutoLinkPlugin />
        <AIGeneratorPlugin />
        <LexicalClickableLinkPlugin />
        <TodosPlugin />
        <WikilinkPlugin />
        <WikilinkEventListenerPlugin
          openOrCreatePageByTitle={openOrCreatePageByTitle}
          thisPageTitle={page.title}
        />
        {shouldHighlight && <SearchHighlighterPlugin pageId={page.id} />}
        {floatingAnchorElem && !isSmallWidthViewport && (
          <>
            <FloatingMenuPlugin
              anchorElem={floatingAnchorElem}
              menuConfig={[
                {
                  component: FloatingCheckmark,
                  shouldShow: shouldShowFloatingCheckmark,
                  computePosition: computeFloatingCheckmarkPosition,
                  priority: 15,
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
                  component: FloatingCheckmark,
                  shouldShow: shouldShowFloatingCheckmark,
                  computePosition: computeFloatingCheckmarkPosition,
                  priority: 15,
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
        {requestFocus && <AutoFocusPlugin/>}
      </LexicalComposer>
    </PromisesProvider>
  );
}

export default Editor;
