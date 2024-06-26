"use client";

import React, { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { useBreakpoint } from '@/lib/window-helpers';
import EditorContainer from '@/_app/editor/editor-container';
import { Page } from '@/lib/definitions';

function FlexibleEditorLayout ({
  openPageIds,
  currentPages,
  updatePageContentsLocal,
  updatePageTitleLocal,
  closePage,
  openOrCreatePageByTitle,
  deletePage,
  pinnedPageIds,
  onPagePinToggle,
}: {
  openPageIds: string[];
  currentPages: Page[];
  updatePageContentsLocal: (id: string, newValue: string, revisionNumber: number) => void;
  updatePageTitleLocal: (id: string, newTitle: string, revisionNumber: number, lastModified: Date) => void;
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
  deletePage: (id: string) => void;
  pinnedPageIds: string[];
  onPagePinToggle: (pageId: string) => void;
}) {

  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);

  useBreakpoint(1537, isSmallWidthViewport, setIsSmallWidthViewport);

  const sortPages = useCallback((pageIds: string[]): string[] => {
    const pages = pageIds.map(id => currentPages.find(p => p.id === id)).filter(p => p !== undefined) as Page[];
    const firstPage = pages[0];
    const pinnedPages = pages.filter(p => pinnedPageIds.includes(p.id) && p.id !== firstPage.id);
    const unpinnedPages = pages.filter(p => !pinnedPageIds.includes(p.id) && p.id !== firstPage.id);

    console.log("pinned page ids in flexible editor layout", pinnedPageIds);
    return [
      firstPage.id,
      ...pinnedPages.map(p => p.id),
      ...unpinnedPages.map(p => p.id)
    ];
  }, [currentPages, pinnedPageIds]);

  const [sortedPageIds, setSortedPageIds] = useState<string[]>(() => sortPages(openPageIds));

  useEffect(() => {
    setSortedPageIds(sortPages(openPageIds));
  }, [openPageIds, currentPages, sortPages]);

  if (isSmallWidthViewport) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {sortedPageIds.map((pageId, index) => renderEditorContainer(pageId, index === 0))}
      </div>
    );
  } else {
    return (
      <div className="flex gap-4 w-full">
        <div className="column flex flex-col w-1/2">
          {sortedPageIds.filter((_, index) => index % 2 === 0).map((pageId, index) => renderEditorContainer(pageId, index === 0))}
        </div>
        <div className="column flex flex-col w-1/2">
          {sortedPageIds.filter((_, index) => index % 2 !== 0).map((pageId) => renderEditorContainer(pageId, false))}
        </div>
      </div>
    );
  }

  function renderEditorContainer(pageId: string, requestFocus: boolean) {
    const page = currentPages.find(p => p.id === pageId);
    console.log("is this page pinned", pinnedPageIds.includes(pageId));
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
        onPagePinToggle={onPagePinToggle}
        isPinned={pinnedPageIds.includes(page.id)}
      />
    );
  }
};

export default FlexibleEditorLayout;
