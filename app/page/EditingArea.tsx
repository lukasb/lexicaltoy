"use client";

import { Page, isPage } from "@/app/lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "@/app/lib/pages-helpers";
import { useState, useCallback } from "react";
import { insertPage, deletePage } from "@/app/lib/actions";
import { useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { PagesContext } from '@/app/context/pages-context';
import { DEFAULT_JOURNAL_CONTENTS } from "@/app/lib/journal-helpers";
import { fetchPages } from "@/app/lib/db";
import { getJournalTitle } from '@/app/lib/journal-helpers';
import { handleNewJournalPage, handleDeleteStaleJournalPages, getTodayJournalPage } from "@/app/lib/journal-helpers";
import FlexibleEditorLayout from "./FlexibleEditorContainer";

function EditingArea({ pages, userId }: { pages: Page[]; userId: string }) {

  const [currentPages, setCurrentPages] = useState(pages);
  const emptyPageMarkdownString = '- ';

  const initialPageId = findMostRecentlyEditedPage(currentPages)?.id;
  const todayJournalPageId = getTodayJournalPage(currentPages)?.id;
  const [openPageIds, setOpenPageIds] = useState<string[]>(() => {
    const initialIds: string[] = [];
    if (initialPageId && initialPageId !== todayJournalPageId) initialIds.push(initialPageId);
    if (todayJournalPageId) initialIds.push(todayJournalPageId);
    return initialIds;
  });

  const omnibarRef = useRef<{ focus: () => void } | null>(null);
  const setupDoneRef = useRef(false);

  const executeJournalLogic = useCallback(() => {
    console.log('Executing journal logic');
    const today = new Date();
    const todayJournalTitle = getJournalTitle(today);
    if (!currentPages.some((page) => (page.title === todayJournalTitle && page.isJournal))) {
      handleNewJournalPage(todayJournalTitle, userId, today, setCurrentPages, openPage);
    }
    handleDeleteStaleJournalPages(today, DEFAULT_JOURNAL_CONTENTS, currentPages, setCurrentPages);
  }, [userId, currentPages]);

  useEffect(() => {
    const fetchAndSetPages = async () => {
      const pages = await fetchPages(userId);
      setCurrentPages(pages);
    };
    fetchAndSetPages();
  }, [userId]);

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
    const page = currentPages.find((p) => p.title.toLowerCase() === title.toLowerCase());
    if (page) {
      openPage(page);
    } else {
      handleNewPage(title);
    }
  }

  const openPage = (page: Page) => {
    console.log("opening page", page);
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
      setCurrentPages((prevPages) => [result, ...prevPages]);
      openPage(result);
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
            updatePageTitleLocal={(id, newTitle, newRevisionNumber) => {
                setCurrentPages((prevPages) =>
                      prevPages.map((page) =>
                        page.id === id
                          ? {
                              ...page,
                              title: newTitle,
                              revisionNumber: newRevisionNumber,
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
      </PagesContext.Provider>
    </div>
  )  
}

export default EditingArea;
