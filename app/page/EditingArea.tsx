"use client";

import EditorContainer from "../editor/editor-container";
import { Page } from "../lib/definitions";
import Omnibar from "./Omnibar";

function EditingArea({
  pages
}: {
  pages: Page[];
}) {

  const initialPage = pages[0];

  return (
    <div className="md:p-4 lg:p-10 xl:p-20 2xl:p-30 transition-spacing ease-linear duration-75">
      <Omnibar pages={pages} />
      <EditorContainer
          pageId={initialPage.id}
          initialPagetitle={initialPage.title}
          initialPageContent={initialPage.value}
        />
    </div>
  );
}

export default EditingArea;