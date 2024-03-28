"use client";

import Editor from "../editor/editor";
import EditablePageTitle from "./pageTitle";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { Page } from "@/app/lib/definitions";
import { isTouchDevice } from "@/app/lib/window-helpers";
import NoSSRWrapper from "../editor/NoSSRWrapper";

function EditorContainer({
  page,
  requestFocus,
  updatePageTitleLocal,
  updatePageContentsLocal,
  closePage,
  openOrCreatePageByTitle,
  deletePage,
}: {
  page: Page;
  requestFocus: boolean;
  updatePageTitleLocal: (id: string, newTitle: string, newRevisionNumber: number) => void;
  updatePageContentsLocal: (id: string, newValue: string, newRevisionNumber: number) => void;
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
  deletePage: (id: string, oldRevisionNumber: number) => void;
}) {
  const [showDebug, setShowDebug] = useState(false);

  const touchDevice = isTouchDevice();

  return (
    <div className="flex flex-col items-start mb-4">
      <div className="relative border-solid border-4 border-indigo-300 rounded-lg m-0 p-7 w-full max-w-7xl">
        <div className="m-0 p-0 group">
          <button
            className="absolute top-0 left-0 ml-3 mt-1 opacity-0 group-hover:opacity-100 text-lg text-indigo-600"
            onClick={() => closePage(page.id)}
          >
            x
          </button>
          <div className="flex flex-row justify-between">
            <EditablePageTitle
              initialTitle={page.title}
              pageId={page.id}
              isJournal={page.isJournal}
              updatePageTitleLocal={updatePageTitleLocal}
            />
            <div className={`flex ${touchDevice ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              {!page.isJournal && (
                <Button
                  className="mx-1"
                  onClick={() => deletePage(page.id, page.revisionNumber)}
                >
                  Del
                </Button>
              )}
              <Button onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? "-d🐞" : "+d🐞"}
              </Button>
            </div>
          </div>
        </div>
        <NoSSRWrapper>
          <Editor
            page={page}
            showDebugInfo={showDebug}
            updatePageContentsLocal={updatePageContentsLocal}
            openOrCreatePageByTitle={openOrCreatePageByTitle}
            requestFocus={requestFocus}
          />
        </NoSSRWrapper>
      </div>
    </div>
  );
}
/*

*/
export default EditorContainer;
