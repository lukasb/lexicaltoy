"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import React, { useRef, useState } from "react";
import { useContext, useCallback } from "react";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import type { EditorState } from "lexical";
import { TextNode } from 'lexical';
import { AutoFocusPlugin } from "@/_app/plugins/MyAutoFocusPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListNode, ListItemNode } from "@lexical/list";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { 
  UNORDERED_LIST,
  $convertToMarkdownString,
  TRANSFORMERS
} from "@lexical/markdown";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { KeyboardShortcutsPlugin } from "@/_app/plugins/KeyboardShortcutsPlugin";
import DraggableBlockPlugin from "@/_app/plugins/DraggableBlockPlugin";
import { useDebouncedCallback } from "use-debounce";
import { theme } from "./editor-theme";
import { FloatingMenuPlugin } from "@/_app/plugins/FloatingMenuPlugin";
import { useBreakpoint } from "@/lib/window-helpers";
import { ListCommandsPlugin } from "@/_app/plugins/ListCommandsPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import TreeViewPlugin from "@/_app/plugins/TreeViewPlugin/TreeViewPlugin";
import { AutoLinkPlugin } from "@/_app/plugins/AutoLinkPlugin";
import LexicalClickableLinkPlugin from "@lexical/react/LexicalClickableLinkPlugin";
import { WikilinkNode, WikilinkInternalNode } from "@/_app/nodes/WikilinkNode";
import { WikilinkPlugin } from "@/_app/plugins/WikilinkPlugin";
import WikilinkEventListenerPlugin from "@/_app/plugins/WikilinkEventListenerPlugin";
import FloatingIndentButtons from '@/_app/plugins/FloatingMenuPlugin/FloatingIndentButtons';
import { shouldShowFloatingIndentButtons, computeFloatingIndentButtonsPosition } from "@/_app/plugins/FloatingMenuPlugin/FloatingIndentButtons";
import FloatingWikiPageNames from "@/_app/plugins/FloatingMenuPlugin/FloatingWikiPageNames";
import { shouldShowFloatingWikiPageNames, computeFloatingWikiPageNamesPosition } from "@/_app/plugins/FloatingMenuPlugin/FloatingWikiPageNames";
import { Page } from "@/lib/definitions";
import { PagesContext } from "@/_app/context/pages-context";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TodoCheckboxStatusNode } from "@/_app/nodes/TodoNode";
import { TodosPlugin } from "@/_app/plugins/TodosPlugin";
import FloatingSlashCommands from '@/_app/plugins/FloatingMenuPlugin/FloatingSlashCommands';
import { shouldShowFloatingSlashCommands, computeFloatingSlashCommandsPosition } from "@/_app/plugins/FloatingMenuPlugin/FloatingSlashCommands";
import { FormulaEditorNode, FormulaDisplayNode } from "@/_app/nodes/FormulaNode";
import { FormulaPlugin } from "@/_app/plugins/FormulaPlugin";
import { PromisesProvider } from "@/_app/context/formula-request-context";
import { stripSharedNodesFromMarkdown } from "@/lib/formula/formula-markdown-converters";
import { PageListenerPlugin } from "@/_app/plugins/PageListenerPlugin";
import { FormattableTextNode } from "@/_app/nodes/FormattableTextNode";
import { $myConvertFromMarkdownString } from "@/lib/markdown/markdown-import";
import FloatingCheckmark from "../plugins/FloatingMenuPlugin/FloatingCheckmark";
import { shouldShowFloatingCheckmark, computeFloatingCheckmarkPosition } from "../plugins/FloatingMenuPlugin/FloatingCheckmark";
import { SearchHighlighterPlugin } from "@/_app/plugins/SearchHighlighterPlugin";
import { useSearchTerms } from "../context/search-terms-context";

function onError(error: Error) {
  console.error("Editor error:", error);
}

type EditorProps = {
  page: Page;
  showDebugInfo: boolean;
  requestFocus: boolean;
  updatePageContentsLocal: (id: string, newValue: string, revisionNumber: number) => void;
  openOrCreatePageByTitle: (title: string) => void;
  closePage: (id: string) => void;
};

function Editor({
  page,
  showDebugInfo,
  requestFocus,
  updatePageContentsLocal,
  openOrCreatePageByTitle,
  closePage,
}: EditorProps) {

  const initialConfig = {
    editorState: () => $myConvertFromMarkdownString(page.value, false),
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
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);
  const pendingChangeRef = useRef<string | null>(null);
  const localVersionRef = useRef<number>(page.revisionNumber);
  const { getSearchTerms, deleteSearchTerms } = useSearchTerms();
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [shouldHighlight, setShouldHighlight] = useState<boolean>(getSearchTerms(page.id).length > 0);

  const getPage = useCallback((id: string) => {
    return pages.find((page) => page.id === id);
  }, [pages]);

  useBreakpoint(768, isSmallWidthViewport, setIsSmallWidthViewport);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  const saveChange = useCallback((newContent: string) => {
    const currentPage = getPage(page.id);
    if (currentPage) {
      if (localVersionRef.current > currentPage.revisionNumber) {
        console.log("Local version is newer than current page version, not saving.");
        return;
      }
      updatePageContentsLocal(page.id, newContent, currentPage.revisionNumber);
      localVersionRef.current = currentPage.revisionNumber + 1;
      pendingChangeRef.current = null;
    }
  }, [page.id, getPage, updatePageContentsLocal]);

  const debouncedSave = useDebouncedCallback(saveChange, 500);

  const onChange = useCallback((editorState: EditorState) => {
    if (!editorState) return;
    editorState.read(() => {
      const editorStateMarkdown = $convertToMarkdownString(TRANSFORMERS);
      const pageContentsWithoutSharedNodes = stripSharedNodesFromMarkdown(editorStateMarkdown);
      const trimmedPageContents = pageContentsWithoutSharedNodes.replace(/\s$/, '');
      const trimmedPageValue = page.value.replace(/\s$/, '');
      if (trimmedPageContents !== trimmedPageValue) {
        pendingChangeRef.current = pageContentsWithoutSharedNodes;
        debouncedSave(pageContentsWithoutSharedNodes);
        setShouldHighlight(false);
        deleteSearchTerms(page.id);
      } else {
        pendingChangeRef.current = null; // Clear pending change if content matches current page value
      }
    });
  }, [page.value, debouncedSave, deleteSearchTerms, page.id]);

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

  React.useEffect(() => {
    setSearchTerms(getSearchTerms(page.id));
  }, [page.id, getSearchTerms]);

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
        <LexicalClickableLinkPlugin />
        <FormulaPlugin />
        <TodosPlugin />
        <WikilinkPlugin />
        <WikilinkEventListenerPlugin
          openOrCreatePageByTitle={openOrCreatePageByTitle}
        />
        {shouldHighlight && <SearchHighlighterPlugin searchTerms={searchTerms} />}
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
        {requestFocus && !shouldHighlight && <AutoFocusPlugin/>}
      </LexicalComposer>
    </PromisesProvider>
  );
}

export default Editor;
