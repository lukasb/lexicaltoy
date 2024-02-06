"use client";

import EditorContainer from "../editor/editor-container";
import { Page } from "../lib/definitions";
import Omnibar from "./Omnibar";
import { findMostRecentlyEditedPage } from "../lib/pages-helpers";
import { useState } from "react";

function EditingArea({
  pages
}: {
  pages: Page[];
}) {

  const [currentPages, setCurrentPages] = useState(pages);

  // TODO let findMostRecentlyEditedPage return null if no pages
  // then create a new page if no pages
  const initialPage = findMostRecentlyEditedPage(currentPages);

  return (
    <div className="md:p-4 lg:p-10 xl:p-20 2xl:p-30 transition-spacing ease-linear duration-75">
      <Omnibar pages={currentPages} />
      <EditorContainer
          pageId={initialPage.id}
          initialPagetitle={initialPage.title}
          initialPageContent={initialPage.value}
          updatePageTitleLocal={(id, newTitle) => {
            setCurrentPages(currentPages.map(page => 
              page.id === id ? { ...page, title: newTitle } : page
            ));
          }}
        />
    </div>
  );
}

export default EditingArea;