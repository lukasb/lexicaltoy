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

  // TODO maybe render a headless editor on the server to enable server-side rendering?
  return (
    <div className="flex flex-col items-start mb-4">
      <div className="relative border-solid border-4 border-indigo-300 rounded-lg m-0 pt-2 pr-7 pb-7 pl-0 w-full max-w-7xl">
        <div className="h-5"></div>
        <div className="sticky top-0 m-0 p-0 bg-bgBase/85 z-30 grid grid-rows-1 grid-cols-[28px_1fr] group items-center">
          <button
            className="col-start-1 row-start-1 text-lg text-indigo-600 md:opacity-0 md:group-hover:opacity-100 self-start"
            onClick={() => closePage(page.id)}
          >
            x
          </button>

          <div className="col-start-2 row-start-1 flex justify-between items-center">
            <EditablePageTitle
              initialTitle={page.title}
              pageId={page.id}
              isJournal={page.isJournal}
              updatePageTitleLocal={updatePageTitleLocal}
            />
            <div
              className={`flex ${
                touchDevice
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
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
          <div className="pl-7 mt-4">
          <Editor
            page={page}
            showDebugInfo={showDebug}
            updatePageContentsLocal={updatePageContentsLocal}
            openOrCreatePageByTitle={openOrCreatePageByTitle}
            requestFocus={requestFocus}
          />
          </div>
        </NoSSRWrapper>
      </div>
    </div>
  );
}
/*

*/
export default EditorContainer;
