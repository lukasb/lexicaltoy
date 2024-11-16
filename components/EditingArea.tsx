"use client";

import { Page, isPage, PageStatus } from "@/lib/definitions";
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
  getJournalTitle
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
  updatePage,
  PageSyncResult,
  fetchUpdatedPages,
  processQueuedUpdates
} from "@/_app/context/storage/storage-context";
import { usePageUpdate } from "@/_app/context/page-update-context";

function EditingArea({ userId, pages }: { userId: string, pages: Page[] }) {

  const [isClient, setIsClient] = useState(false)

  const emptyPageMarkdownString = '- ';

  const [pinnedPageIds, setPinnedPageIds] = useState<string[]>([]);
  const [collapsedPageIds, setCollapsedPageIds] = useState<string[]>([]);
  const { setBlockIdsForPage } = useBlockIdsIndex();
  const { msAddPage, msDiscardPage, msSlurpPages } = useMiniSearch();
  const hasInitializedSearch = useRef(false);
  let initCount = 0;

  const { getPageUpdate, addPageUpdate, setPageUpdateStatus } = usePageUpdate();

  const handleConflict = useCallback((pageId: string) => {
    if (getPageUpdate(pageId)) {
      setPageUpdateStatus(pageId, PageStatus.Conflict);
    } else {
      addPageUpdate(pageId, PageStatus.Conflict);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function fetch() {
      if (userId) {
        console.log("fetching updated pages");
        await fetchUpdatedPages(userId);
      }
    }
    async function processUpdates() {
      if (userId) {
        console.log("processing queued updates");
        await processQueuedUpdates(userId, handleConflict);
      }
    }
    fetch();
    const fetchIntervalId = setInterval(fetch, 60000);
    const processIntervalId = setInterval(processUpdates, 8000);
    return () => {
      clearInterval(fetchIntervalId);
      clearInterval(processIntervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!hasInitializedSearch.current) {
      initCount++;
      if (initCount > 1) console.error("MiniSearch initialized more than once, count:", initCount);
      msSlurpPages(pages || []);
      hasInitializedSearch.current = true;
    }
  }, [pages, msSlurpPages]);

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

  const initialPageId = findMostRecentlyEditedPage(pages || [])?.id;
  const lastWeekJournalPageIds = getLastWeekJournalPages(pages || []).map(page => page.id);
  const [openPageIds, setOpenPageIds] = useState<string[]>(() => {
    if (!pages) return [];
    const initialIds: string[] = [];
    if (initialPageId && !lastWeekJournalPageIds.includes(initialPageId)) initialIds.push(initialPageId);
    initialIds.push(...lastWeekJournalPageIds);
    return initialIds;
  });

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
        const result = await insertNewJournalPage(todayJournalTitle, userId, today);
      } catch (error) {
        console.error("error creating new journal page", todayJournalTitle, error);
      }
    }
    try {
      await deleteStaleJournalPages(today, DEFAULT_JOURNAL_CONTENTS, userId);
    } catch (error) {
      console.error("error deleting stale journal pages", error);
    }
  }, [userId, pages]);

  useEffect(() => {
    if (!setupDoneRef.current) {
      executeJournalLogic();
      setupDoneRef.current = true;
    }
    const intervalId = setInterval(executeJournalLogic, 30000);
    return () => clearInterval(intervalId);
  }, [executeJournalLogic]);

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

  const handleUpdatePageTitle = async (page: Page, newTitle: string) => {
    const result = await updatePage(page, page.value, newTitle, page.deleted);
    if (result === PageSyncResult.Conflict) {
      console.error("error updating page title");
      return;
    }
  }

  const handleNewPage = async (title: string) => {
    const [newPage, result] = await insertPage(title, emptyPageMarkdownString, userId, false);
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

  const handleDeletePage = async (id: string) => {
    const page = pages?.find((p) => p.id === id);
    if (!page) return;
    const result = await updatePage(page, page.value, page.title, true);
    if (result === PageSyncResult.Conflict) {
      console.error("Failed to delete page");
      return;
    }
    msDiscardPage(id);
    setOpenPageIds((prevPageIds) => prevPageIds.filter((pId) => pId !== id));
  }

  const handlePagePinToggle = (pageId: string) => {
    console.log("toggling pin for", pageId);
    const newPinnedPageIds = togglePagePin(pageId);
    setPinnedPageIds(newPinnedPageIds);
  };

  const handlePageCollapseToggle = (pageId: string) => {
    const newCollapsedPageIds = togglePageCollapse(pageId);
    setCollapsedPageIds(newCollapsedPageIds);
  };

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
          <div className="w-full h-40 flex justify-center items-center">
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
