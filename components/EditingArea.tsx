"use client";

import { Page, isPage, PageStatus } from "@/lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "@/lib/pages-helpers";
import { useState, useCallback, useEffect, useRef } from "react";
import { insertPage } from "@/lib/db";
import { deletePage } from "@/lib/db";
import { Button } from "../_app/ui/button";
import { PagesContext } from '@/_app/context/pages-context';
import { 
  DEFAULT_JOURNAL_CONTENTS,
  handleNewJournalPage,
  handleDeleteStaleJournalPages,
  getLastWeekJournalPages,
  getJournalPageByDate,
  getJournalTitle
 } from "@/lib/journal-helpers";
import { fetchPagesRemote } from "@/lib/db";
import FlexibleEditorLayout from "./FlexibleEditorContainer";
import PagesManager from "../lib/PagesManager";
import { SharedNodeProvider } from "../_app/context/shared-node-context";

function EditingArea({ pages, userId }: { pages: Page[]; userId: string }) {

  const [isClient, setIsClient] = useState(false)
  const [currentPages, setCurrentPages] = useState<Page[]>(pages);
  const emptyPageMarkdownString = '- ';

  const initialPageId = findMostRecentlyEditedPage(currentPages)?.id;
  const lastWeekJournalPageIds = getLastWeekJournalPages(currentPages).map(page => page.id);
  const [openPageIds, setOpenPageIds] = useState<string[]>(() => {
    const initialIds: string[] = [];
    if (initialPageId && !lastWeekJournalPageIds.includes(initialPageId)) initialIds.push(initialPageId);
    initialIds.push(...lastWeekJournalPageIds);
    return initialIds;
  });

  const omnibarRef = useRef<{ focus: () => void } | null>(null);
  const setupDoneRef = useRef(false);

  useEffect(() => {
    setIsClient(true)
  }, [])

  const fetchAndSetPages = useCallback(async () => {
    const pages = await fetchPagesRemote(userId);
    if (!pages) return []; // TODO something better here
    setCurrentPages(pages);
    return pages;
  }, [userId, setCurrentPages]);

  const executeJournalLogic = useCallback(async () => {
    const today = new Date();
    const todayJournalTitle = getJournalTitle(today);
    if (!currentPages.some((page) => (page.title === todayJournalTitle && page.isJournal))) {
      const journalPage = await handleNewJournalPage(todayJournalTitle, userId, today);
      if (isPage(journalPage)) {
        setCurrentPages((prevPages: Page[]) => [journalPage, ...prevPages]);
        openPage(journalPage);
      } else {
        // journal page was created elsewhere, reload so we get it
        const freshPages = await fetchAndSetPages();
        const todayJournalPage = getJournalPageByDate(freshPages, today);
        if (todayJournalPage) openPage(todayJournalPage);
      }
    }
    handleDeleteStaleJournalPages(today, DEFAULT_JOURNAL_CONTENTS, currentPages, setCurrentPages);
  }, [userId, currentPages, fetchAndSetPages]);

  useEffect(() => {
    fetchAndSetPages();
  }, [userId, fetchAndSetPages]);

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
      if ((event.metaKey && event.key === "k") || event.key === "Escape") {
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
    const page = currentPages.find((p) => p.title.toLowerCase() === title.toLowerCase());
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
        return [page.id, ...prevPageIds];
      } else {
        if (pageIndex === 0) {
          return prevPageIds;
        } else {
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
    const result = await insertPage(title, emptyPageMarkdownString, userId);
    if (typeof result === "string") {
      console.error("expected page, got string", result);
      return;
    } else if (isPage(result)) {
      console.log("got a page");
      setCurrentPages((prevPages) => [result, ...prevPages]);
      openPage(result);
    } else {
      console.error("expected page, got something else", result);
    }
  };

  const handleDeletePage = async (id: string) => {
    const page = currentPages.find((p) => p.id === id);
    if (!page) return;
    const result = await deletePage(id, page.revisionNumber);
    if (result === -1) {
      console.error("Failed to delete page");
      return;
    }
    setCurrentPages((prevPages) => prevPages.filter((p) => p.id !== id));
    setOpenPageIds((prevPageIds) => prevPageIds.filter((pId) => pId !== id));
  }

  return (
    <div className="md:p-4 lg:p-5 transition-spacing ease-linear duration-75">
      <PagesContext.Provider value={currentPages}>
        <SharedNodeProvider>
        <PagesManager setPages={setCurrentPages} />
        <Omnibar
          ref={omnibarRef}
          openOrCreatePageByTitle={openOrCreatePageByTitle}
        />
        {openPageIds.length === 0 ? (
          <div className="w-full h-40 flex justify-center items-center">
            <Button onClick={() => handleNewPage("New Page")}>
              Create New Page
            </Button>
          </div>
        ) : (
          <FlexibleEditorLayout
            openPageIds={openPageIds}
            currentPages={currentPages}
            updatePageTitleLocal={(id, newTitle, newRevisionNumber, newLastModified) => {
                setCurrentPages((prevPages) =>
                      prevPages.map((page) =>
                        page.id === id
                          ? {
                              ...page,
                              title: newTitle,
                              revisionNumber: newRevisionNumber,
                              lastModified: newLastModified
                            }
                          : page
                      )
                    );
                  }}
                  updatePageContentsLocal={(id, newValue, newRevisionNumber) => {
                    setCurrentPages((prevPages) =>
                      prevPages.map((page) =>
                        page.id === id
                          ? {
                              ...page,
                              value: newValue,
                              revisionNumber: newRevisionNumber,
                              status: PageStatus.UserEdit
                            }
                          : page
                      )
                    );
                  }}
                  closePage={(id) => {
                    setOpenPageIds(prevPageIds => prevPageIds.filter(pageId => pageId !== id));
                  }}
                  openOrCreatePageByTitle={openOrCreatePageByTitle}
                  deletePage={handleDeletePage}
            />
          )}
          </SharedNodeProvider>
      </PagesContext.Provider>
    </div>
  )  
}

export default EditingArea;
