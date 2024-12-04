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
import { PagesContext } from '@/_app/context/pages-context';
import { 
  DEFAULT_JOURNAL_CONTENTS,
  insertNewJournalPage,
  deleteStaleJournalPages,
  getLastWeekJournalPages,
  getJournalTitle,
  getTodayJournalTitle
 } from "@/lib/journal-helpers";
import FlexibleEditorLayout from "./FlexibleEditorContainer";
import PagesManager from "../lib/PagesManager";
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
import { useMiniSearch } from "@/_app/context/minisearch-context";
import { 
  insertPage,
  PageSyncResult,
  fetchUpdatedPages,
  processQueuedUpdates
} from "@/_app/context/storage/storage-context";
import { usePageStatus } from "@/_app/context/page-update-context";
import { createConflictHandler } from "@/lib/conflict-manager";

function EditingArea({ userId, pages }: { userId: string, pages: Page[] | undefined }) {

  const [isClient, setIsClient] = useState(false)
  const [pinnedPageIds, setPinnedPageIds] = useState<string[]>([]);
  const [collapsedPageIds, setCollapsedPageIds] = useState<string[]>([]);
  const { setBlockIdsForPage } = useBlockIdsIndex();
  const { msAddPage, msSlurpPages } = useMiniSearch();
  const hasInitializedSearch = useRef(false);
  let initCount = 0;

  const { addPageStatus, removePageStatus, setPageRevisionNumber } = usePageStatus();

  const [initialFetchComplete, setInitialFetchComplete] = useState(false);

  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const handleConflict = useCallback(
    async (pageId: string, errorCode: ConflictErrorCode) => {
      return createConflictHandler({
        removePageStatus: removePageStatus,
        addPageStatus: addPageStatus,
        pages: pagesRef.current || [],
        userId, 
      })(pageId, errorCode);
    },
    [removePageStatus, addPageStatus, userId]
  );

  const updateRevisionNumber = useCallback((pageId: string, revisionNumber: number) => {
    setPageRevisionNumber(pageId, revisionNumber);
  }, [setPageRevisionNumber]);

  const fetch = useCallback(async () => {
    if (userId) {
      console.log("fetching updated pages...");
      await fetchUpdatedPages(userId);
      setInitialFetchComplete(true);
    } else {
      console.error("no user id, can't fetch updated pages");
    }
  }, [userId]);
  
  const processUpdates = useCallback(async () => {
    if (userId) {
      console.log("processing queued updates");
      await processQueuedUpdates(userId, handleConflict, updateRevisionNumber);
    } else {
      console.error("no user id, can't process queued updates");
    }
  }, [userId, handleConflict, updateRevisionNumber]);

  useEffect(() => {
    console.log("setting up fetch interval");
    if (!initialFetchComplete) fetch();
    
    const fetchIntervalId = setInterval(fetch, 30000);
    const processIntervalId = setInterval(processUpdates, 8000);
    
    return () => {
      console.log("clearing fetch interval");
      clearInterval(fetchIntervalId);
      clearInterval(processIntervalId);
    };
  }, [fetch, processUpdates, initialFetchComplete]);

  useEffect(() => {
    if (!hasInitializedSearch.current && pages && pages.length > 0 && initialFetchComplete) {
      initCount++;
      if (initCount > 1) console.error("MiniSearch initialized more than once, count:", initCount);
      msSlurpPages(pages || []);
      hasInitializedSearch.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, msSlurpPages, initialFetchComplete]);

  useEffect(() => {
    const pnnedPageIds = getPinnedPageIds();
    setPinnedPageIds(pnnedPageIds);
  }, []);

  useEffect(() => {
    const collapsedPageIds = getCollapsedPageIds();
    setCollapsedPageIds(collapsedPageIds);
  }, []);

  useEffect(() => {
    for (const page of pages || []) {
      setTimeout(() => ingestPageBlockIds(page.title, page.value, setBlockIdsForPage), 0);
    }
  }, [pages, setBlockIdsForPage]);

  const initializedPagesRef = useRef(false);
  const [openPageIds, setOpenPageIds] = useState<string[]>([]);

  useEffect(() => {
    for (const pageId of openPageIds) {
      if (!pages?.find(p => p.id === pageId)) {
        setOpenPageIds(prevIds => prevIds.filter(id => id !== pageId));
      }
    }
  }, [pages, openPageIds]);

  useEffect(() => {
    if (pages && pages.length > 0 && initialFetchComplete) {
      if (!initializedPagesRef.current) {
        const initialPageId = findMostRecentlyEditedPage(pages)?.id;
        const lastWeekJournalPageIds = getLastWeekJournalPages(pages).map(page => page.id);
        
        const initialIds: string[] = [];
        if (initialPageId && !lastWeekJournalPageIds.includes(initialPageId)) {
          initialIds.push(initialPageId);
        }
        initialIds.push(...lastWeekJournalPageIds);
        
        setOpenPageIds(initialIds);
          initializedPagesRef.current = true;
      } else if (openPageIds.length === 0) {
        const todayJournalTitle = getTodayJournalTitle();
        const todayJournalPage = pages.find(p => p.title === todayJournalTitle && p.isJournal);
        if (todayJournalPage) {
          setOpenPageIds([todayJournalPage.id]);
        }
      }
    }
  }, [pages, initialFetchComplete, openPageIds]);

  useEffect(() => {
    setOpenPageIds(prevIds => [...new Set([...prevIds, ...pinnedPageIds])]);
  }, [pinnedPageIds]);

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
        const [newPage, result] = await insertNewJournalPage(todayJournalTitle, userId, today);
        if (isPage(newPage)) {
          msAddPage(newPage);
          openPage(newPage);
        }
      } catch (error) {
        console.error("error creating new journal page", todayJournalTitle, error);
      }
    }
    try {
      await deleteStaleJournalPages(today, DEFAULT_JOURNAL_CONTENTS, userId);
    } catch (error) {
      console.error("error deleting stale journal pages", error);
    }
  }, [userId, pages, msAddPage]);

  useEffect(() => {
    if (initialFetchComplete && !setupDoneRef.current) {
      executeJournalLogic();
      setupDoneRef.current = true;
    }
    const intervalId = setInterval(executeJournalLogic, 30000);
    return () => clearInterval(intervalId);
  }, [executeJournalLogic, initialFetchComplete]);

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
    console.log("initial fetch complete", initialFetchComplete);
    const page = pages?.find((p) => p.title.toLowerCase() === title.toLowerCase());
    if (page) {
      console.log("opening page", page.title, pages);
      openPage(page);
    } else {
      console.log("creating new page", title, pages);
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
      console.error("error creating page");
      return;
    } else if (isPage(newPage)) {
      msAddPage(newPage);
      openPage(newPage);
    } else {
      console.error("expected page, got something else", result);
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        console.log("tab became visible, fetching updated pages");
        fetchUpdatedPages(userId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  return (
    <div className="md:p-4 lg:p-5 transition-spacing ease-linear duration-75">
      <PagesContext.Provider value={pages || []}>
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
        {(!pages || pages.length === 0 || openPageIds.length === 0) ? (
          <div className="w-full h-40 flex justify-center items-center flex-col gap-2">
            <div className="text-sm text-muted-foreground">
              Debug: pages={pages ? 'defined' : 'undefined'}, 
              pages.length={pages?.length || 0}, 
              openPageIds.length={openPageIds.length}
            </div>
            <Button onClick={() => handleNewPage("New Page")}>
              Create New Page
            </Button>
          </div>
        ) : (
          <FlexibleEditorLayout
            openPageIds={openPageIds}
            currentPages={pages || []}
            closePage={(id) => {
              setOpenPageIds(prevPageIds => prevPageIds.filter(pageId => pageId !== id));
            }}
            openOrCreatePageByTitle={openOrCreatePageByTitle}
            pinnedPageIds={pinnedPageIds}
            onPagePinToggle={handlePagePinToggle}
            collapsedPageIds={collapsedPageIds}
            onPageCollapseToggle={handlePageCollapseToggle}
            />
          )}
          </SearchTermsProvider>
          </SharedNodeProvider>
        </ActiveEditorProvider>
        </SavedSelectionProvider>
        </OpenWikilinkWithBlockIdProvider>
      </PagesContext.Provider>
    </div>
  )  
}

export default EditingArea;
