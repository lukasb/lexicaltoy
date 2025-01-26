"use client";

import { 
  Page, 
  isPage, 
  DEFAULT_NONJOURNAL_PAGE_VALUE,
  ConflictErrorCode
} from "@/lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "@/lib/pages-helpers";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "../_app/ui/button";
import { 
  DEFAULT_JOURNAL_CONTENTS,
  insertNewJournalPage,
  deleteStaleJournalPages,
  getLastWeekJournalPages,
  getJournalTitle,
  getTodayJournalTitle
 } from "@/lib/journal-helpers";
import FlexibleEditorLayout from "./FlexibleEditorContainer";
import { PagesManager } from "../lib/PagesManager";
import { SharedNodeProvider } from "../_app/context/shared-node-context";
import { ActiveEditorProvider } from "@/_app/context/active-editor-context";
import { SearchTermsProvider } from "@/_app/context/search-terms-context";
import { 
  getPinnedPageIds, 
  togglePagePin,
  getCollapsedPageIds,
  togglePageCollapse
} from "@/lib/pages-helpers";
import { SavedSelectionProvider } from "@/_app/context/saved-selection-context";
import { OpenWikilinkWithBlockIdProvider } from "@/_app/context/wikilink-blockid-context";
import { useBlockIdsIndex, ingestPageBlockIds } from "@/_app/context/page-blockids-index-context";
import { miniSearchService } from "@/_app/services/minisearch-service";
import { 
  insertPage,
  PageSyncResult,
  fetchUpdatedPages,
  processQueuedUpdates
} from "@/_app/context/storage/storage-context";
import { usePageStatusStore } from "@/lib/stores/page-status-store";
import { createConflictHandler } from "@/lib/conflict-manager";

export const PROCESS_QUEUE_INTERVAL = 8000;
import { localPagesRef } from "@/_app/context/storage/dbPages";

function EditingArea({ userId }: { userId: string }) {

  const [loadingMessage, setLoadingMessage] = useState<string | null>("Loading pages...");
  const [isClient, setIsClient] = useState(false)
  const [pinnedPageIds, setPinnedPageIds] = useState<string[]>([]);
  const [collapsedPageIds, setCollapsedPageIds] = useState<string[]>([]);
  const { setBlockIdsForPage } = useBlockIdsIndex();
  const hasInitializedSearch = useRef(false);
  const [pagesDefined, setPagesDefined] = useState(false);
  const hasIngestedBlockIds = useRef(false);
  const pages = localPagesRef.current;
  let initCount = 0;

  const { addPageStatus, removePageStatus, setPageRevisionNumber } = usePageStatusStore();

  const [initialFetchComplete, setInitialFetchComplete] = useState(false);

  useEffect(() => {
    if (pages) {
      setPagesDefined(true);
    }
  }, [pages]);

  const handleConflict = useCallback(
    async (pageId: string, errorCode: ConflictErrorCode) => {
      return createConflictHandler({
        removePageStatus: removePageStatus,
        addPageStatus: addPageStatus
      })(pageId, errorCode);
    },
    [removePageStatus, addPageStatus]
  );

  const updateRevisionNumber = useCallback((pageId: string, revisionNumber: number) => {
    setPageRevisionNumber(pageId, revisionNumber);
  }, [setPageRevisionNumber]);

  interface LoadingState {
    isLoading: boolean;
    error: Error | null;
  }
  
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    error: null
  });
  
  const initializeOpenPages = useCallback(() => {
    console.log("initializeOpenPages maybe", pages?.length, initializedPagesRef.current);
    if (!pages || pages.length === 0 || initializedPagesRef.current) return;
    console.log("time to initialize open pages");
    const initialPageId = findMostRecentlyEditedPage(pages)?.id;
    const lastWeekJournalPageIds = getLastWeekJournalPages(pages).map(page => page.id);
    
    const initialIds: string[] = [];
    if (initialPageId && !lastWeekJournalPageIds.includes(initialPageId)) {
      initialIds.push(initialPageId);
    }
    initialIds.push(...lastWeekJournalPageIds);
    initialIds.push(...pinnedPageIds);
    
    setOpenPageIds(prevIds => [...new Set([...prevIds, ...initialIds])]);
    initializedPagesRef.current = true;
  }, [pinnedPageIds, pages]);

  const fetch = useCallback(async () => {
    if (!userId) return;

    try {
      console.log("fetching updated pages");
      const fetchPromise = fetchUpdatedPages(userId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initial fetch timeout')), 5000)
      );

      const oldPageIds = new Set(pages?.map(p => p.id) || []);
      
      try {
        await Promise.race([fetchPromise, timeoutPromise]);
        
        // After fetch completes, handle minisearch updates
        if (pages) {
          const newPageIds = new Set(pages.map(p => p.id));
          
          // Find deleted pages (in old but not in new)
          for (const oldPageId of oldPageIds) {
            if (!newPageIds.has(oldPageId)) {
              console.log("discarding deleted page from minisearch", oldPageId);
              miniSearchService.discardPage(oldPageId);
            }
          }
          
          // Find new pages (in new but not in old)
          const newPagesToAdd = pages.filter(p => !oldPageIds.has(p.id));
          if (newPagesToAdd.length > 0) {
            console.log("adding new pages to minisearch", newPagesToAdd.length);
            for (const page of newPagesToAdd) {
              miniSearchService.addPage(page);
            }
          }
        }
      } catch (error) {
        // If it's a timeout error, still try to continue with any data we have
        if (error instanceof Error && error.message === 'Initial fetch timeout') {
          console.warn('Initial fetch timed out, continuing with available data');
        } else {
          throw error; // Re-throw other errors to be caught by outer try-catch
        }
      }
    } catch (error) {
      console.log("🛑 Failed to fetch updates:", error);
      setLoadingState({ 
        isLoading: false, 
        error: error instanceof Error ? error : new Error('Unknown error occurred') 
      });
    } finally {
      setLoadingState(prevState => ({ ...prevState, isLoading: false }));
      setTimeout(() => setInitialFetchComplete(true), 10);
    }
  }, [userId, pages]);
  
  const processUpdates = useCallback(async () => {
    if (userId) {
      console.log("processing queued updates");
      await processQueuedUpdates(userId, handleConflict, updateRevisionNumber);
    } else {
      console.log("🛑 no user id, can't process queued updates");
    }
  }, [userId, handleConflict, updateRevisionNumber]);

  const fetchIntervalId = useRef<NodeJS.Timeout | null>(null);
  const processIntervalId = useRef<NodeJS.Timeout | null>(null);

  const setupIntervals = useCallback(() => {
    if (!fetchIntervalId.current) fetchIntervalId.current = setInterval(fetch, 30000);
    if (!processIntervalId.current) processIntervalId.current = setInterval(processUpdates, PROCESS_QUEUE_INTERVAL);
  }, [fetch, processUpdates]);

  const clearIntervals = useCallback(() => {
    if (fetchIntervalId.current) {
      clearInterval(fetchIntervalId.current);
      fetchIntervalId.current = null;
    }
    if (processIntervalId.current) {
      clearInterval(processIntervalId.current);
      processIntervalId.current = null;
    }
  }, []);

  useEffect(() => {
    if (!pagesDefined) return;
    
    fetch();
    setupIntervals();
    
    return () => {
      clearIntervals();
    };
  }, [pagesDefined, fetch, processUpdates, clearIntervals, setupIntervals]);

  useEffect(() => {
    console.log("Search initialization effect triggered", {
      hasInitialized: hasInitializedSearch.current,
      pagesDefined,
      pagesLength: pages?.length,
      initialFetchComplete,
      pages: pages
    });

    if (!hasInitializedSearch.current && 
        pagesDefined && 
        pages && 
        pages.length > 0 && 
        initialFetchComplete) {
      hasInitializedSearch.current = true;
      initCount++;
      if (initCount > 1) console.log("🛑 MiniSearch initialized more than once, count:", initCount);
      console.log("slurping pages", pages);
      miniSearchService.slurpPages(pages);
      initializeOpenPages();
    }
  }, [initialFetchComplete, pagesDefined, initCount, initializeOpenPages, pages]);

  useEffect(() => {
    const pnnedPageIds = getPinnedPageIds();
    setPinnedPageIds(pnnedPageIds);
  }, []);

  useEffect(() => {
    const collapsedPageIds = getCollapsedPageIds();
    setCollapsedPageIds(collapsedPageIds);
  }, []);

  useEffect(() => {
    if (hasIngestedBlockIds.current) return;
    for (const page of pages || []) {
      setTimeout(() => ingestPageBlockIds(page.title, page.value, setBlockIdsForPage), 0);
    }
    hasIngestedBlockIds.current = true;
  }, [setBlockIdsForPage, pages]);

  const initializedPagesRef = useRef(false);
  const [openPageIds, setOpenPageIds] = useState<string[]>([]);

  useEffect(() => {
    if (pages && pages.length > 0) {
      initializeOpenPages();
      
      // Keep the today's journal page logic
      const todayJournalTitle = getTodayJournalTitle();
      const todayJournalPage = pages.find(p => p.title === todayJournalTitle && p.isJournal);
      if (todayJournalPage && !openPageIds.includes(todayJournalPage.id)) {
        setOpenPageIds(prevIds => [todayJournalPage.id, ...prevIds]);
      }
    }
  }, [openPageIds, initializeOpenPages, pages]);

  const omnibarRef = useRef<{ focus: () => void } | null>(null);
  const setupDoneRef = useRef(false);

  useEffect(() => {
    setIsClient(true)
  }, [])

  const executeJournalLogic = useCallback(async () => {
    const today = new Date();
    const todayJournalTitle = getJournalTitle(today);
    if (!pages?.some((page) => (page.title === todayJournalTitle && page.isJournal))) {
      try {
        console.log("inserting today's journal page");
        const [newPage, result] = await insertNewJournalPage(todayJournalTitle, userId, today);
        if (isPage(newPage) && result === PageSyncResult.Success) {
          miniSearchService.addPage(newPage);
          openPage(newPage);
        } else {
          console.log("🛑 error creating new journal page", todayJournalTitle, result);
        }
      } catch (error) {
        console.log("🛑 error creating new journal page", todayJournalTitle, error);
      }
    }
    try {
      console.log("deleting stale journal pages");
      await deleteStaleJournalPages(today, DEFAULT_JOURNAL_CONTENTS, userId);
    } catch (error) {
      console.log("🛑 error deleting stale journal pages", error);
    }
  }, [userId, pages]);

  useEffect(() => {
    if (initialFetchComplete && !setupDoneRef.current && pages) {
      executeJournalLogic();
      setupDoneRef.current = true;
    }
    const intervalId = setInterval(executeJournalLogic, 30000);
    return () => clearInterval(intervalId);
  }, [executeJournalLogic, initialFetchComplete, pages]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === "k") {
        event.preventDefault();
        omnibarRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openOrCreatePageByTitle = (title: string) => {
    const page = pages?.find((p) => p.title.toLowerCase() === title.toLowerCase());
    if (page) {
      openPage(page);
    } else {
      handleNewPage(title);
    }
  }

  const openPage = (page: Page) => {
    setOpenPageIds((prevPageIds) => {
      // doing all this inside the setOpenPages is necessary in some cases (like when opening from clicking a wikilink)
      // and not in others (like when opening from the omnibar.) I have no idea why.
      const pageIndex = prevPageIds.findIndex((pId) => pId === page.id);
      if (pageIndex === -1) {
        console.log("adding page to open page ids", page.id);
        return [page.id, ...prevPageIds];
      } else {
        if (pageIndex === 0) {
          console.log("page is already at the front of the list", page.id);
          return prevPageIds;
        } else {
          console.log("moving page to the front of the list", page.id);
          // Move the page to the front.
          const updatedPageIds = [...prevPageIds];
          updatedPageIds.splice(pageIndex, 1);
          updatedPageIds.unshift(page.id);
          return updatedPageIds;
        }
      }
    });
  };  

  const handleNewPage = async (title: string) => {
    const [newPage, result] = await insertPage(title, DEFAULT_NONJOURNAL_PAGE_VALUE, userId, false);
    if (result === PageSyncResult.Conflict) {
      console.log("🛑 error creating page");
      return;
    } else if (isPage(newPage)) {
      miniSearchService.addPage(newPage);
      openPage(newPage);
    } else {
      console.log("🛑 expected page, got something else", result);
    }
  };

  const handlePagePinToggle = (pageId: string) => {
    console.log("toggling pin for", pageId);
    const newPinnedPageIds = togglePagePin(pageId);
    setPinnedPageIds(newPinnedPageIds);
  };

  const handlePageCollapseToggle = (pageId: string) => {
    const newCollapsedPageIds = togglePageCollapse(pageId);
    setCollapsedPageIds(newCollapsedPageIds);
  };

  useEffect(() => {
    const handlePageStateChange = async () => {
      if (!userId) return;

      if (document.visibilityState === 'hidden') {
        // Force process any pending updates before the page becomes hidden
        console.log("tab becoming hidden, processing pending updates");
        clearIntervals();
        await processQueuedUpdates(userId, handleConflict, updateRevisionNumber);
      } else if (document.visibilityState === 'visible') {
        console.log("tab became visible, fetching updated pages");
        await fetchUpdatedPages(userId);
        setupIntervals();
      }
    };

    const handlePageHide = async () => {
      if (!userId) return;
      console.log("page hide event, processing pending updates");
      clearIntervals();
      await processQueuedUpdates(userId, handleConflict, updateRevisionNumber);
    };

    document.addEventListener('visibilitychange', handlePageStateChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handlePageStateChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [userId, handleConflict, updateRevisionNumber, clearIntervals, setupIntervals]);

  return (
    <div className="md:p-4 lg:p-5 transition-spacing ease-linear duration-75">
        <OpenWikilinkWithBlockIdProvider>
          <SavedSelectionProvider>
            <ActiveEditorProvider>
              <SharedNodeProvider>
                <SearchTermsProvider>
                  <PagesManager />
                  <Omnibar
                    ref={omnibarRef}
                    openOrCreatePageByTitle={openOrCreatePageByTitle}
                  />
                  {loadingState.isLoading ? (
                    <div className="w-full h-40 flex justify-center items-center flex-col gap-2">
                      <div className="text-sm text-muted-foreground">
                        {loadingMessage}
                      </div>
                      <Button onClick={() => setLoadingState(prev => ({ ...prev, isLoading: false }))}>
                        Skip Loading
                      </Button>
                    </div>
                  ) : !pagesDefined ? (
                    <div className="w-full h-40 flex justify-center items-center flex-col gap-2">
                      <div>Cannot connect to local database</div>
                    </div>
                  ) : openPageIds.length === 0 ? (
                    <div className="w-full h-40 flex justify-center items-center flex-col gap-2">
                      <Button onClick={() => handleNewPage("New Page")}>
                        Create New Page
                      </Button>
                    </div>
                  ) : (
                    <FlexibleEditorLayout
                      openPageIds={openPageIds}
                      closePage={(id) => {
                        setOpenPageIds((prevPageIds) =>
                          prevPageIds.filter((pageId) => pageId !== id)
                        );
                      }}
                      openOrCreatePageByTitle={openOrCreatePageByTitle}
                      pinnedPageIds={pinnedPageIds}
                      onPagePinToggle={handlePagePinToggle}
                      collapsedPageIds={collapsedPageIds}
                      onPageCollapseToggle={handlePageCollapseToggle}
                      topPageId={openPageIds[0]}
                    />
                  )}
                </SearchTermsProvider>
              </SharedNodeProvider>
            </ActiveEditorProvider>
          </SavedSelectionProvider>
        </OpenWikilinkWithBlockIdProvider>
    </div>
  );  
}

export default EditingArea;