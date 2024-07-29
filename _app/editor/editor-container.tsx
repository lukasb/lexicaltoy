"use client";

import Editor from "./editor";
import EditablePageTitle from "./pageTitle";
import { useState, useEffect } from "react";
import { Page } from "@/lib/definitions";
import { isTouchDevice } from "@/lib/window-helpers";
import NoSSRWrapper from "./NoSSRWrapper";
import { MoreVertical } from "lucide-react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Pin } from 'lucide-react';
import { useBreakpoint } from "@/lib/window-helpers";

function EditorContainer({
  page,
  requestFocus,
  updatePageTitleLocal,
  updatePageContentsLocal,
  closePage,
  openOrCreatePageByTitle,
  deletePage,
  isPinned,
  onPagePinToggle,
}: {
  page: Page;
  requestFocus: boolean;
  updatePageTitleLocal: (id: string, newTitle: string, newRevisionNumber: number, newLastModified: Date) => void;
  updatePageContentsLocal: (id: string, newValue: string, newRevisionNumber: number) => void;
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
  deletePage: (id: string, oldRevisionNumber: number) => void;
  isPinned: boolean;
  onPagePinToggle: (pageId: string) => void;
}) {
  const [showDebug, setShowDebug] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localIsPinned, setLocalIsPinned] = useState(isPinned);
  const touchDevice = isTouchDevice();
  const [isMobile, setIsMobile] =
    useState<boolean>(false);

  useBreakpoint(768, isMobile, setIsMobile);

  useEffect(() => {
    setLocalIsPinned(isPinned);
  }, [isPinned]);

  const handlePinToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalIsPinned(!localIsPinned);
    onPagePinToggle(page.id);
  };

  // TODO maybe render a headless editor on the server to enable server-side rendering?
  return (
    <div className="flex flex-col items-start md:mb-4">
      <div className="relative border-solid shadow-md dark:shadow-gray-500/50 md:shadow-none md:border-4 md:border-indigo-300 md:rounded-lg m-0 pt-2 pr-2.5 md:pr-7 pb-7 pl-0 w-full max-w-7xl">
        {!isMobile && !touchDevice && (
          <button
            className="absolute top-2 left-2 text-base text-indigo-600 py-0 px-1 rounded md:opacity-0 md:hover:opacity-100 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 z-40"
            onClick={() => closePage(page.id)}
          >
            ✖
          </button>
        )}
        <div className="h-1 md:h-3"></div>
        <div className="sticky top-0 m-0 p-0 bg-bgBase/85 z-30 grid grid-rows-1 grid-cols-[21px_1fr] md:grid-cols-[28px_1fr] group items-center">
          <div className="col-start-2 row-start-1 flex justify-between items-center">
            <EditablePageTitle
              initialTitle={page.title}
              pageId={page.id}
              isJournal={page.isJournal}
              updatePageTitleLocal={updatePageTitleLocal}
            />
            <div className="flex items-center">
              <button
                onClick={handlePinToggle}
                className={`p-1 rounded hover:bg-gray-700 focus:outline-none focus:ring-0 focus:ring-gray-500 ${
                  !localIsPinned && !touchDevice
                    ? "opacity-0 group-hover:opacity-100"
                    : ""
                }`}
              >
                <Pin
                  className={`h-5 w-5 text-gray-300`}
                  fill={localIsPinned ? "currentColor" : "none"}
                />
              </button>
              <DropdownMenu.Root onOpenChange={setIsMenuOpen}>
                <DropdownMenu.Trigger asChild>
                  <button
                    className={`p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 ${
                      touchDevice || isMenuOpen
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    } ${
                      isMenuOpen
                        ? "bg-gray-300 hover:bg-gray-400"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    <MoreVertical
                      className={`h-5 w-5 ${
                        isMenuOpen ? "text-gray-800" : "text-gray-300"
                      }`}
                    />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[200px] bg-gray-800 rounded-md overflow-hidden shadow-md z-40"
                    align="end"
                    sideOffset={5}
                  >
                    <DropdownMenu.Item
                      className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700"
                      onClick={() => closePage(page.id)}
                    >
                      Close
                    </DropdownMenu.Item>
                    {!page.isJournal && (
                      <DropdownMenu.Item
                        className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700"
                        onClick={() => deletePage(page.id, page.revisionNumber)}
                      >
                        Delete
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Item
                      className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700"
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
          <div className="pl-[22px] pr-1 md:pl-[29px] mt-4">
            <Editor
              page={page}
              showDebugInfo={showDebug}
              updatePageContentsLocal={updatePageContentsLocal}
              openOrCreatePageByTitle={openOrCreatePageByTitle}
              requestFocus={requestFocus}
              closePage={closePage} // Added this line
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
