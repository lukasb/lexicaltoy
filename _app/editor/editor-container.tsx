"use client";

import Editor from "./editor";
import EditablePageTitle from "./pageTitle";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { Page } from "@/lib/definitions";
import { isTouchDevice } from "@/lib/window-helpers";
import NoSSRWrapper from "./NoSSRWrapper";
import { MoreVertical } from "lucide-react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

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
  updatePageTitleLocal: (id: string, newTitle: string, newRevisionNumber: number, newLastModified: Date) => void;
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
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
                  <MoreVertical className="h-5 w-5 text-gray-300" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[200px] bg-gray-800 rounded-md py-2 px-1 shadow-md"
                  align="end"
                  sideOffset={5}
                >
                  {!page.isJournal && (
                    <DropdownMenu.Item
                      className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700 rounded"
                      onClick={() => deletePage(page.id, page.revisionNumber)}
                    >
                      Delete
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item
                    className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700 rounded"
                    onClick={() => setShowDebug(!showDebug)}
                  >
                    {showDebug ? "Hide Debug" : "Show Debug"}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
