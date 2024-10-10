"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import React, { useState } from "react";
import { useContext } from "react";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { 
  UNORDERED_LIST,
} from "@lexical/markdown";
import { theme } from "./editor-theme";
import { useBreakpoint } from "@/lib/window-helpers";
import { ListCommandsPlugin } from "@/_app/plugins/ListCommandsPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoLinkPlugin } from "@/_app/plugins/AutoLinkPlugin";
import LexicalClickableLinkPlugin from "@lexical/react/LexicalClickableLinkPlugin";
import { WikilinkPlugin } from "@/_app/plugins/WikilinkPlugin";
import { PagesContext } from "@/_app/context/pages-context";
import { TodosPlugin } from "@/_app/plugins/TodosPlugin";
import { FormulaPlugin } from "@/_app/plugins/FormulaPlugin";
import { PromisesProvider } from "@/_app/context/formula-request-context";
import { AIGeneratorPlugin } from "../plugins/AIGeneratorPlugin";
import { NodeElementMarkdown } from "@/lib/formula/formula-definitions";
import { editorNodes } from "./shared-editor-config";
import { BacklinksViewerPlugin } from "../plugins/BacklinksViewerPlugin";
import WikilinkEventListenerPlugin from "@/_app/plugins/WikilinkEventListenerPlugin";

function onError(error: Error) {
  console.error("Editor error:", error);
}

type BacklinksViewerProps = {
  backlinks: NodeElementMarkdown[];
  openOrCreatePageByTitle: (title: string) => void;
};

function BacklinksViewer({ backlinks, openOrCreatePageByTitle }: BacklinksViewerProps) {

  const initialConfig = {
    namespace: "orangetask-backlinks",
    theme,
    nodes: editorNodes,
    editable: false,
    onError,
  };

  const pages = useContext(PagesContext);
  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);

  useBreakpoint(768, isSmallWidthViewport, setIsSmallWidthViewport);

  return (
    <PromisesProvider>
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={
            <div className="relative">
              <ContentEditable className="w-full outline-none" />
            </div>
          }
          // absolute positioning is the Lexical team's official recommendation for placeholders
          placeholder={<div className="absolute top-10 left-10"></div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={[UNORDERED_LIST]} />
        <ListCommandsPlugin />
        <HistoryPlugin />
        <AutoLinkPlugin />
        <AIGeneratorPlugin />
        <LexicalClickableLinkPlugin />
        <FormulaPlugin />
        <TodosPlugin />
        <WikilinkPlugin />
        <BacklinksViewerPlugin backlinks={backlinks} />
        <WikilinkEventListenerPlugin
          openOrCreatePageByTitle={openOrCreatePageByTitle}
        />
      </LexicalComposer>
    </PromisesProvider>
  );
}

export default BacklinksViewer;
