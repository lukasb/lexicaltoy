"use client";

import EditorContainer from "../editor/editor-container";
import { Page, isPage } from "../lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "../lib/pages-helpers";
import { useState } from "react";
import { insertPage } from "../lib/actions";
import { useEffect, useRef } from "react";
import { Button } from "../ui/button";

function EditingArea({ pages, userId }: { pages: Page[]; userId: string }) {
  
  // TODO we're doing a lot of prop drilling now, maybe we should use context

  const [currentPages, setCurrentPages] = useState(pages);
  const [pageTitles, setPageTitles] = useState<string[]>([]); // TODO maybe don't do this
  const emptyPageJSONString =
    '{"root":{"children":[{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

  // TODO let findMostRecentlyEditedPage return null if no pages
  // then create a new page if no pages
  const initialPage = findMostRecentlyEditedPage(currentPages);
  const [openPages, setOpenPages] = useState<Page[]>([initialPage]);

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

  useEffect(() => {
    setPageTitles(currentPages.map(page => page.title));
  }, [currentPages]);

  const openOrCreatePageByTitle = (title: string) => {
    const page = currentPages.find((p) => p.title.toLowerCase() === title.toLowerCase());
    if (page) {
      openPage(page);
    } else {
      handleNewPage(title);
    }
  }

  const openPage = (page: Page) => {
    if (!currentPages.includes(page)) {
      setCurrentPages([...currentPages, page]);
    }
    const pageIndex = openPages.findIndex((p) => p.id === page.id);
    if (pageIndex === -1) {
      setOpenPages((prevPages) => [page, ...prevPages]);
    } else {
      setOpenPages((prevPages) => {
        const otherPages = prevPages.filter((p) => p.id !== page.id);
        return [page, ...otherPages];
      });
    }
  };

  const handleNewPage = async (title: string) => {
    const result = await insertPage(title, emptyPageJSONString, userId);
    if (typeof result === "string") {
      console.error("expected page, got string", result);
      return;
    } else if (isPage(result)) {
      openPage(result);
    }
  };

  return (
    <div className="md:p-4 lg:p-5 transition-spacing ease-linear duration-75">
      <Omnibar
        ref={omnibarRef}
        pages={currentPages}
        createNewPage={(title) => handleNewPage(title)}
        openPage={openPage}
      />
      {openPages.length === 0 ? (
        <div className="w-full h-40 flex justify-center items-center">
          <Button onClick={() => handleNewPage("New Page")}>
            Create New Page
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          {openPages.map((page) => (
            <EditorContainer
              key={page.id}
              pageId={page.id}
              initialPagetitle={page.title}
              initialPageContent={page.value}
              pageTitles={pageTitles}
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
                setOpenPages(openPages.filter((page) => page.id !== id));
              }}
              openOrCreatePageByTitle={openOrCreatePageByTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default EditingArea;
