"use client";

import EditorContainer from "../editor/editor-container";
import { Page, isPage } from "../lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "../lib/pages-helpers";
import { useState } from "react";
import { insertPage } from "../lib/actions";

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
  const [currentPage, setCurrentPage] = useState(initialPage);

  const handleNewPage = async (title: string) => {
    const result = await insertPage(title, emptyPageJSONString, userId);
    if (typeof result === "string") {
      console.error(result);
      return;
    } else if (isPage(result)) {
      setCurrentPages([...currentPages, result]);
      setCurrentPage(result);
    }
  }

  return (
    <div className="md:p-4 lg:p-10 xl:p-20 2xl:p-30 transition-spacing ease-linear duration-75">
      <Omnibar 
        pages={currentPages} 
        createNewPage={(title) => handleNewPage(title)}
        setCurrentPage={setCurrentPage}
      />
      <EditorContainer
          key={currentPage.id}
          pageId={currentPage.id}
          initialPagetitle={currentPage.title}
          initialPageContent={currentPage.value}
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
        />
    </div>
  );
}

export default EditingArea;