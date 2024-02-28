"use client";

import EditorContainer from "../editor/editor-container";
import { Page, isPage } from "../lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "../lib/pages-helpers";
import { useState } from "react";
import { insertPage } from "../lib/actions";
import { useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { PagesContext } from '@/app/context/pages-context';

function EditingArea({ pages, userId }: { pages: Page[]; userId: string }) {
  
  // TODO we're doing a lot of prop drilling now, maybe we should use context

  const [currentPages, setCurrentPages] = useState(pages);
  const emptyPageJSONString =
    '{"root":{"children":[{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

  // TODO let findMostRecentlyEditedPage return null if no pages
  // then create a new page if no pages
  const initialPageId = findMostRecentlyEditedPage(currentPages)?.id;
  const [openPageIds, setOpenPageIds] = useState<string[]>(initialPageId ? [initialPageId] : []);

  const omnibarRef = useRef<{ focus: () => void } | null>(null);

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
    const result = await insertPage(title, emptyPageJSONString, userId);
    if (typeof result === "string") {
      console.error("expected page, got string", result);
      return;
    } else if (isPage(result)) {
      setCurrentPages((prevPages) => [result, ...prevPages]);
      openPage(result);
    }
  };

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
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
            {openPageIds.map((pageId) => {
              const page = currentPages.find(p => p.id === pageId);
              if (!page) return null;
              return (
                <EditorContainer
                  key={page.id}
                  pageId={page.id}
                  initialPagetitle={page.title}
                  initialPageContent={page.value}
                  initialRevisionNumber={page.revisionNumber}
                  updatePageTitleLocal={(id, newTitle) => {
                    setCurrentPages(
                      currentPages.map((page) =>
                        page.id === id ? { ...page, title: newTitle } : page
                      )
                    );
                  }}
                  updatePageContentsLocal={(id, newValue, newRevisionNumber) => {
                    setCurrentPages(
                      currentPages.map((page) =>
                        page.id === id ? { ...page, value: newValue, revisionNumber: newRevisionNumber } : page
                      )
                    );
                  }}
                  closePage={(id) => {
                    setOpenPageIds(prevPageIds => prevPageIds.filter(pageId => pageId !== id));
                  }}
                  openOrCreatePageByTitle={openOrCreatePageByTitle}
                />
              );
            })}
          </div>
        )}
      </PagesContext.Provider>
    </div>
  );
  
}

export default EditingArea;
