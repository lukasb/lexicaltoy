"use client";

import Editor from "../editor/editor";
import EditablePageTitle from "./pageTitle";
import { Button } from "../ui/button";
import { useState } from "react";

function EditorContainer({
  pageId,
  initialPagetitle,
  initialPageContent,
}: {
  pageId: string;
  initialPagetitle: string;
  initialPageContent: string;
}) {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="flex flex-col items-start md:p-4 lg:p-10 xl:p-20 2xl:p-30 transition-spacing ease-linear duration-75">
      <div className="border-solid border-4 border-indigo-300 rounded-lg m-0 p-7 w-full max-w-7xl">
        <div className="flex flex-row justify-between">
        <EditablePageTitle initialTitle={initialPagetitle} pageId={pageId} />
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
