import React from 'react';
import { useState } from 'react';
import { useBreakpoint } from '../lib/window-helpers';
import EditorContainer from '@/app/editor/editor-container';
import { Page } from '@/app/lib/definitions';

function FlexibleEditorLayout ({
  openPageIds,
  currentPages,
  updatePageContentsLocal,
  updatePageTitleLocal,
  closePage,
  openOrCreatePageByTitle,
  deletePage,
}: {
  openPageIds: string[];
  currentPages: Page[];
  updatePageContentsLocal: (id: string, newValue: string, revisionNumber: number) => void;
  updatePageTitleLocal: (id: string, newTitle: string, revisionNumber: number) => void;
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
  deletePage: (id: string) => void;
}) {

  const [isSmallWidthViewport, setIsSmallWidthViewport] =
  useState<boolean>(false);

  useBreakpoint(1537, isSmallWidthViewport, setIsSmallWidthViewport);

  if (isSmallWidthViewport) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {openPageIds.map((pageId, index) => renderEditorContainer(pageId, index === 0))}
      </div>
    );
  } else {
    return (
      <div className="flex gap-4 w-full">
        <div className="column flex flex-col w-1/2">
          {openPageIds.filter((_, index) => index % 2 === 0).map((pageId, index) => renderEditorContainer(pageId, index === 0))}
        </div>
        <div className="column flex flex-col w-1/2">
          {openPageIds.filter((_, index) => index % 2 !== 0).map((pageId) => renderEditorContainer(pageId, false))}
        </div>
      </div>
    );
  }

  function renderEditorContainer(pageId: string, requestFocus: boolean) {
    const page = currentPages.find(p => p.id === pageId);
    if (!page) return null;
    return (
      <EditorContainer
        key={page.id}
        page={page}
        requestFocus={requestFocus}
        updatePageContentsLocal={updatePageContentsLocal}
        updatePageTitleLocal={updatePageTitleLocal}
        closePage={closePage}
        openOrCreatePageByTitle={openOrCreatePageByTitle}
        deletePage={deletePage}
      />
    );
  }
};

export default FlexibleEditorLayout;
