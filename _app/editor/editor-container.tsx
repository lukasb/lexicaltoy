"use client";

import Editor from "./editor";
import EditablePageTitle from "./pageTitle";
import { useState, useEffect, useRef } from "react";
import { isTouchDevice } from "@/lib/window-helpers";
import NoSSRWrapper from "./NoSSRWrapper";
import { MoreVertical, ChevronDown, ChevronUp } from "lucide-react";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Pin } from 'lucide-react';
import { useBreakpoint } from "@/lib/window-helpers";
import { getModifierKey } from "@/lib/utils";
import { findCallback } from "@/lib/formula/function-definitions";
import { FormulaValueType, NodeElementMarkdown } from "@/lib/formula/formula-definitions";
import BacklinksViewer from "./backlinks-viewer";
import { EditDialog } from "@/_app/ui/edit-dialog";
import { updatePage, PageSyncResult} from "@/_app/context/storage/storage-context"
import { PageStatus } from "@/lib/definitions";
import { usePageStatusStore } from "@/lib/stores/page-status-store";
import { miniSearchService } from "@/_app/services/minisearch-service";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "../context/storage/db";
import { PROCESS_QUEUE_INTERVAL } from "@/components/EditingArea";
import { localPagesRef } from "@/_app/context/storage/dbPages";

function EditorContainer({
  requestFocus,
  closePage,
  openOrCreatePageByTitle,
  isPinned,
  isCollapsed,
  onPagePinToggle,
  onPageCollapseToggle,
  pageId
}: {
  requestFocus: boolean;
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
  isPinned: boolean;
  isCollapsed: boolean;
  onPagePinToggle: (pageId: string) => void;
  onPageCollapseToggle: (pageId: string) => void;
  pageId: string;
}) {
  const [showDebug, setShowDebug] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localIsPinned, setLocalIsPinned] = useState(isPinned);
  const [localIsCollapsed, setLocalIsCollapsed] = useState(false);
  const touchDevice = isTouchDevice();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [modifierKey, setModifierKey] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [backlinks, setBacklinks] = useState<NodeElementMarkdown[]>([]);
  const [backlinksCollapsed, setBacklinksCollapsed] = useState(true);
  const { pageStatuses, getPageStatus, setPageStatus } = usePageStatusStore();
  const conflictNotificationRef = useRef<HTMLDivElement>(null);
  const [queueStartTime, setQueueStartTime] = useState<number | null>(null);
  const [showQueueIndicator, setShowQueueIndicator] = useState(false);

  useEffect(() => {
    setModifierKey(getModifierKey());
  }, []);

  useBreakpoint(768, isMobile, setIsMobile);

  useEffect(() => {
    setLocalIsPinned(isPinned);
  }, [isPinned]);

  useEffect(() => {
    setLocalIsCollapsed(isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    if (getPageStatus(pageId)?.status === PageStatus.Conflict) {
      setTimeout(() => {
        const elementTop = conflictNotificationRef.current?.getBoundingClientRect().top;
        const offsetPosition = (elementTop || 0) + window.pageYOffset - 100;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [getPageStatus(pageId)?.status]);

  const queuedUpdates = useLiveQuery(
    () => localDb.queuedUpdates.where("id").equals(pageId).toArray()
  );  

  const page = useLiveQuery(
    async () => {
      const localPage = await localDb.pages.where("id").equals(pageId).toArray();
      const queuedUpdate = await localDb.queuedUpdates.where("id").equals(pageId).toArray();
      return queuedUpdate[0] || localPage[0];
  }, [pageId]);

  useEffect(() => {
    if (queuedUpdates && queuedUpdates.length > 0) {
      if (queueStartTime === null) {
        setQueueStartTime(Date.now());
      }
    } else {
      setQueueStartTime(null);
      setShowQueueIndicator(false);
    }

    let intervalId: NodeJS.Timeout;
    if (queueStartTime !== null) {
      intervalId = setInterval(() => {
        const timeInQueue = Date.now() - queueStartTime;
        setShowQueueIndicator(timeInQueue > PROCESS_QUEUE_INTERVAL);
      }, 300);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [queuedUpdates, queueStartTime]);

  const handlePinToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalIsPinned(!localIsPinned);
    onPagePinToggle(pageId);
  };

  const handleCollapsedToggle = () => {
    setLocalIsCollapsed(!localIsCollapsed);
    onPageCollapseToggle(pageId);
  };

  const handleTitleClick = () => {
    handleCollapsedToggle();
  };


  const handleDeletePage = async () => {
    if (!page) return;
    const result = await updatePage(page, page.value, page.title, true, new Date(new Date().toISOString()));
    if (result === PageSyncResult.Conflict || result === PageSyncResult.Error) {
      alert("Failed to delete page");
    }
    closePage(pageId);
  }

  const handleRename = async (newTitle: string) => {
    if (!page) return;
    const result = await updatePage(page, page.value, newTitle, false, new Date(new Date().toISOString()));
    if (result === PageSyncResult.Conflict || result === PageSyncResult.Error) {
      alert("Failed to update title");
    } else if (result === PageSyncResult.Success) {
      miniSearchService.replacePage({...page, title: newTitle});
    }
    setIsRenameDialogOpen(false);
  };

  useEffect(() => {
    async function fetchBacklinks() {
      if (!page) return;
      const pages = localPagesRef.current;
      if (!pages) return;
      const newBacklinks = await findCallback({ pages: pages }, [{ type: FormulaValueType.Text, output: `[[${page.title}]]` }]);
      if (newBacklinks && newBacklinks.output.length > 0 && newBacklinks.type === FormulaValueType.NodeMarkdown) {
        setBacklinks(newBacklinks.output as NodeElementMarkdown[]);
      } else {
        setBacklinks([]);
      }
    }
    fetchBacklinks();
  }, [page?.title, localPagesRef.current]);

  const toggleBacklinks = () => {
    setBacklinksCollapsed(!backlinksCollapsed);
  };

  // TODO maybe render a headless editor on the server to enable server-side rendering?
  if (!page) return null;
  return (
    <div className="flex flex-col items-start md:mb-4">
      <div className={`relative border-solid shadow-md dark:shadow-gray-500/50 md:shadow-none md:border-4 md:rounded-lg m-0 pt-2 pr-2.5 md:pr-7 ${backlinks.length > 0 && !localIsCollapsed ? 'pb-3' : 'pb-5'} pl-0 w-full max-w-7xl ${
        localIsCollapsed ? 'md:border-indigo-200' : 'md:border-indigo-300'
      }`}>
        {!isMobile && !touchDevice && (
          <button
            className="absolute top-2 left-2 text-base text-indigo-600 py-0 px-1 rounded md:opacity-0 md:hover:opacity-100 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 z-40"
            onClick={() => closePage(pageId)}
          >
            ✖
          </button>
        )}
        <div className="h-1 md:h-3"></div>
        <div className={`sticky top-0 m-0 p-0 bg-bgBase/85 z-30 grid grid-rows-1 grid-cols-[21px_1fr] md:grid-cols-[28px_1fr] group items-center ${
          localIsCollapsed ? 'text-gray-500' : ''
        }`}>
          <div className="col-start-2 row-start-1 flex justify-between items-center">
            <div onClick={handleTitleClick} className="cursor-pointer flex-grow flex items-center">
              <EditablePageTitle
                initialTitle={page.title}
              />
              {showQueueIndicator && (
                <div className="w-2 h-2 rounded-full bg-orange-400 ml-2" />
              )}
            </div>
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
                    onTouchStart={(e) => e.preventDefault()}
                  >
                    <MoreVertical
                      data-testid="page-menu-button"
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
                    {!page.isJournal && (
                    <DropdownMenu.Item
                      className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700"
                      onClick={() => setIsRenameDialogOpen(true)}
                    >
                      Rename
                    </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Item
                      className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700"
                      onClick={() => closePage(pageId)}
                    >
                      Close {!isMobile && `(${modifierKey} + u)`}
                    </DropdownMenu.Item>
                    {!page.isJournal && (
                      <DropdownMenu.Item
                        className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700"
                        onClick={handleDeletePage}
                      >
                        Delete
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Item
                      className="text-sm px-3 py-2 outline-none cursor-pointer text-gray-200 hover:bg-gray-700"
                      onClick={handleCollapsedToggle}
                    >
                      {!localIsCollapsed ? (
                        <>
                          <ChevronUp className="inline-block mr-2" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="inline-block mr-2" />
                          Expand
                        </>
                      )}
                    </DropdownMenu.Item>
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
          <div className={`pl-[22px] pr-1 md:pl-[29px] mt-4 ${localIsCollapsed ? 'hidden' : 'pb-1'}`}>
            {getPageStatus(pageId)?.status === PageStatus.Conflict && (
              <div 
                ref={conflictNotificationRef}
                className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-md flex justify-between items-center"
              >
                <span>Your changes are based on an old version of this page. Click reload to get the latest version. Reloading will lose your changes, so copy anything you do not want to lose and paste it somewhere else.</span>
                <button 
                  onClick={() => setPageStatus(pageId, PageStatus.DroppingUpdate, page.lastModified, page.revisionNumber, undefined)}
                  className="ml-4 px-4 py-2 bg-red-200 dark:bg-red-800 rounded-md hover:bg-red-300 dark:hover:bg-red-700"
                >
                  Reload
                </button>
              </div>
            )}
            <Editor
              page={page}
              showDebugInfo={showDebug}
              openOrCreatePageByTitle={openOrCreatePageByTitle}
              requestFocus={requestFocus}
              closePage={closePage}
            />
          </div>
          {backlinks.length > 0 && !localIsCollapsed && (
            <div className="col-start-2 pl-6">
              <div 
                className="mt-4 mb-2 font-semibold text-md text-gray-400 dark:text-gray-200 cursor-pointer flex items-center"
                onClick={toggleBacklinks}
              >
                <span>Backlinks</span>
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${backlinksCollapsed ? '' : 'transform rotate-180'}`} />
              </div>
              {!backlinksCollapsed && 
                <div className="pl-1 bg-bgFormula">
                  <BacklinksViewer 
                    backlinks={backlinks} 
                    openOrCreatePageByTitle={openOrCreatePageByTitle}
                    thisPageTitle={page.title}
                  />
                </div>
              }
            </div>
          )}
        </NoSSRWrapper>
      </div>
      <EditDialog
        isOpen={isRenameDialogOpen}
        onClose={() => setIsRenameDialogOpen(false)}
        onSubmit={handleRename}
        initialValue={page.title}
        title="Rename Page"
      />
    </div>
  );
}

export default EditorContainer;