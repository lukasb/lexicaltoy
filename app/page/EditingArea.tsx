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
    <div>
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
