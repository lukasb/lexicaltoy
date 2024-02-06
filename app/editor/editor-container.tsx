"use client";

import Editor from "../editor/editor";
import EditablePageTitle from "./pageTitle";
import { Button } from "../ui/button";
import { useState } from "react";

function EditorContainer({
  pageId,
  initialPagetitle,
  initialPageContent,
  updatePageTitleLocal
}: {
  pageId: string;
  initialPagetitle: string;
  initialPageContent: string;
  updatePageTitleLocal: (id: string, newTitle: string) => void;
}) {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="flex flex-col items-start">
      <div className="border-solid border-4 border-indigo-300 rounded-lg m-0 p-7 w-full max-w-7xl">
        <div className="flex flex-row justify-between">
        <EditablePageTitle 
          initialTitle={initialPagetitle} 
          pageId={pageId}
          updatePageTitleLocal={updatePageTitleLocal}
          />
        <Button onClick={() => setShowDebug(!showDebug)}>
        {showDebug ? "Hide Debug" : "Show Debug"}
      </Button>
        </div>
        <Editor
          initialPageContent={initialPageContent}
          pageId={pageId}
          showDebugInfo={showDebug}
        />
      </div>
    </div>
  );
}

export default EditorContainer;
