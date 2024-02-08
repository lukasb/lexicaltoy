"use client";

import EditorContainer from "../editor/editor-container";
import { Page, isPage } from "../lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "../lib/pages-helpers";
import { useState } from "react";
import { insertPage } from "../lib/actions";
import { useEffect, useRef } from "react";

function EditingArea({
  pages,
  userId
}: {
  pages: Page[];
  userId: string;
}) {

  const [currentPages, setCurrentPages] = useState(pages);
  const emptyPageJSONString = '{"root":{"children":[{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

  // TODO let findMostRecentlyEditedPage return null if no pages
  // then create a new page if no pages
  const initialPage = findMostRecentlyEditedPage(currentPages);
  const [openPages, setOpenPages] = useState<Page[]>([initialPage]);

  const omnibarRef = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === 'k') {
        event.preventDefault();
        omnibarRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openPage = (page: Page) => {
    if (!currentPages.includes(page)) {
      setCurrentPages([...currentPages, page]);
    }
    if (!openPages.includes(page)) {
      setOpenPages(prevPages => [page, ...prevPages]);
    } else {
      // move page to the beginning of the array
      setOpenPages(prevPages => [page, ...prevPages.filter(p => p !== page)]);
    }
  }

  const handleNewPage = async (title: string) => {
    const result = await insertPage(title, emptyPageJSONString, userId);
    if (typeof result === "string") {
      console.error(result);
      return;
    } else if (isPage(result)) {
      openPage(result);
    }
  }

  return (
    <div className="md:p-4 lg:p-10 xl:p-20 2xl:p-30 transition-spacing ease-linear duration-75">
      <Omnibar
        ref={omnibarRef} 
        pages={currentPages} 
        createNewPage={(title) => handleNewPage(title)}
        openPage={openPage}
      />
      {openPages.map(page => (
      <EditorContainer
          key={page.id}
          pageId={page.id}
          initialPagetitle={page.title}
          initialPageContent={page.value}
          updatePageTitleLocal={(id, newTitle) => {
            setCurrentPages(currentPages.map(page => 
              page.id === id ? { ...page, title: newTitle } : page
            ));
          }}
          updatePageContentsLocal={(id, newValue) => {
            setCurrentPages(currentPages.map(page => 
              page.id === id ? { ...page, value: newValue } : page
            ));
          }}
          closePage={(id) => {
            setOpenPages(openPages.filter(page => page.id !== id));
          }}
        />
      ))}
    </div>
  );
}

export default EditingArea;