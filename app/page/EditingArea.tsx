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

  // TODO let findMostRecentlyEditedPage return null if no pages
  // then create a new page if no pages
  const initialPage = findMostRecentlyEditedPage(currentPages);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const handleNewPage = async (title: string) => {
    const result = await insertPage(title, "", userId);
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
      />
      <EditorContainer
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