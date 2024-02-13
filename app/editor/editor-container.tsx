"use client";

import Editor from "../editor/editor";
import EditablePageTitle from "./pageTitle";
import { Button } from "../ui/button";
import { useState } from "react";

function EditorContainer({
  pageId,
  initialPagetitle,
  initialPageContent,
  pageTitles,
  updatePageTitleLocal,
  updatePageContentsLocal,
  closePage,
  openOrCreatePageByTitle
}: {
  pageId: string;
  initialPagetitle: string;
  initialPageContent: string;
  pageTitles: string[];
  updatePageTitleLocal: (id: string, newTitle: string) => void;
  updatePageContentsLocal: (id: string, newValue: string) => void;
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
}) {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="flex flex-col items-start mb-4">
      <div className="relative border-solid border-4 border-indigo-300 rounded-lg m-0 p-7 w-full max-w-7xl">
        <div className="m-0 p-0 group">
          <button
            className="absolute top-0 left-0 ml-3 mt-1 opacity-0 group-hover:opacity-100 text-lg text-indigo-600"
            onClick={() => closePage(pageId)}
          >
            x
          </button>
          <div className="flex flex-row justify-between">
            <EditablePageTitle
              initialTitle={initialPagetitle}
              pageId={pageId}
              updatePageTitleLocal={updatePageTitleLocal}
            />
            <Button onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? "-d🐞" : "+d🐞"}
            </Button>
          </div>
        </div>
        <Editor
          initialPageContent={initialPageContent}
          pageId={pageId}
          showDebugInfo={showDebug}
          pageTitles={pageTitles}
          updatePageContentsLocal={updatePageContentsLocal}
          openOrCreatePageByTitle={openOrCreatePageByTitle}
        />
      </div>
    </div>
  );
}

export default EditorContainer;
