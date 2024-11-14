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
import { usePageUpdate } from "../context/page-update-context";

function onError(error: Error) {
  console.error("Editor error:", error);
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
  const pendingChangeRef = useRef<string | null>(null);
  const { getSearchTerms, deleteSearchTerms } = useSearchTerms();
  const [shouldHighlight, setShouldHighlight] = useState<boolean>(getSearchTerms(page.id).length > 0);
  const { setBlockIdsForPage } = useBlockIdsIndex();
  const { addPageUpdate, pageUpdates } = usePageUpdate();

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
      addPageUpdate(page.id, PageStatus.UserEdit, new Date(), newContent);
      ingestPageBlockIds(page.title, newContent, setBlockIdsForPage);
      pendingChangeRef.current = null;
    }
  }, [page.id, getPage, setBlockIdsForPage, page.title, addPageUpdate]);

  const debouncedSave = useDebouncedCallback(saveChange, 100);

  const onChange = useCallback((editorState: EditorState) => {
    if (!editorState) return;
    editorState.read(() => {
      const localPageValue = pageUpdates.get(page.id)?.newValue || page.value;

      const editorStateMarkdown = $myConvertToMarkdownString(TRANSFORMERS, undefined, true);
      const editoContentsWithoutSharedNodes = stripSharedNodesFromMarkdown(editorStateMarkdown);
      //console.log("pageContentsWithoutSharedNodes", pageContentsWithoutSharedNodes);
      const trimmedEditorContents = editoContentsWithoutSharedNodes.replace(/\s$/, '');
      const trimmedPageValue = localPageValue.replace(/\s$/, '');
      if (trimmedEditorContents !== trimmedPageValue) {
        console.group(`Content change in "${page.title}"`);
        console.log("Old:", JSON.stringify(trimmedPageValue));
        console.log("New:", JSON.stringify(trimmedEditorContents));
        console.log("Difference in length:", trimmedEditorContents.length - trimmedPageValue.length);
        console.groupEnd();
        pendingChangeRef.current = editoContentsWithoutSharedNodes;
        debouncedSave(editoContentsWithoutSharedNodes);
        deleteSearchTerms(page.id);
      } else {
        pendingChangeRef.current = null; // Clear pending change if content matches current page value
      }
    });
  }, [page.value, debouncedSave, deleteSearchTerms, page.id, pageUpdates]);

  const onBeforeUnload = useCallback(() => {
    if (pendingChangeRef.current) {
      saveChange(pendingChangeRef.current);
    }
  }, [saveChange]);

  React.useEffect(() => {
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (pendingChangeRef.current) {
        saveChange(pendingChangeRef.current);
      }
    };
  }, [onBeforeUnload, saveChange]);

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
        <PageListenerPlugin pageId={page.id} />
        <MarkdownShortcutPlugin transformers={[UNORDERED_LIST]} />
        <KeyboardShortcutsPlugin closePage={() => closePage(page.id)} />
        <ListCommandsPlugin />
        <HistoryPlugin />
        <AutoLinkPlugin />
        <AIGeneratorPlugin />
        <LexicalClickableLinkPlugin />
        <FormulaPlugin />
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
