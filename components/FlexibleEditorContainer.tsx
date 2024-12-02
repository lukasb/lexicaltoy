"use client";

import React, { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { useBreakpoint } from '@/lib/window-helpers';
import EditorContainer from '@/_app/editor/editor-container';
import { Page } from '@/lib/definitions';

function FlexibleEditorLayout ({
  openPageIds,
  currentPages,
  closePage,
  openOrCreatePageByTitle,
  pinnedPageIds,
  onPagePinToggle,
  collapsedPageIds,
  onPageCollapseToggle
}: {
  openPageIds: string[];
  currentPages: Page[];
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
  pinnedPageIds: string[];
  onPagePinToggle: (pageId: string) => void;
  collapsedPageIds: string[];
  onPageCollapseToggle: (pageId: string) => void;
}) {

  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useBreakpoint(1537, isSmallWidthViewport, setIsSmallWidthViewport);

  const sortPages = useCallback((pageIds: string[]): string[] => {
    if (pageIds.length === 0) return [];
    const pages = pageIds.map(id => currentPages.find(p => p.id === id)).filter(p => p !== undefined) as Page[];
    if (pages.length === 0) return [];
    const firstPage = pages[0];
    if (!firstPage) return [];
    const pinnedPages = pages.filter(p => pinnedPageIds.includes(p.id) && p.id !== firstPage.id);
    const unpinnedPages = pages.filter(p => !pinnedPageIds.includes(p.id) && p.id !== firstPage.id);

    return [
      firstPage.id,
      ...pinnedPages.map(p => p.id),
      ...unpinnedPages.map(p => p.id)
    ];
  }, [currentPages, pinnedPageIds]);

  const [sortedPageIds, setSortedPageIds] = useState<string[]>(() => sortPages(openPageIds));

  useEffect(() => {
    setSortedPageIds(sortPages(openPageIds));
    setIsLoading(false);
  }, [openPageIds, currentPages, sortPages]);

  if (isLoading || !sortedPageIds || sortedPageIds.length === 0) {
    return <div>Loading...</div>; // Or any loading indicator you prefer
  }

  if (isSmallWidthViewport) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {sortedPageIds.map((pageId, index) => renderEditorContainer(pageId, index === 0))}
      </div>
    );
  } else {
    const leftColumnPages: string[] = [];
    const rightColumnPages: string[] = [];

    sortedPageIds.forEach((pageId, index) => {
      if (pinnedPageIds.includes(pageId)) {
        rightColumnPages.push(pageId);
      } else {
        if (index % 2 === 0) {
          leftColumnPages.push(pageId);
        } else {
          rightColumnPages.push(pageId);
        }
      }
    });

    return (
      <div className="flex gap-4 w-full">
        <div className="column flex flex-col w-1/2">
          {leftColumnPages.map((pageId, index) => renderEditorContainer(pageId, index === 0))}
        </div>
        <div className="column flex flex-col w-1/2">
          {rightColumnPages.map((pageId) => renderEditorContainer(pageId, false))}
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
        closePage={closePage}
        openOrCreatePageByTitle={openOrCreatePageByTitle}
        onPagePinToggle={onPagePinToggle}
        isPinned={pinnedPageIds.includes(page.id)}
        isCollapsed={collapsedPageIds.includes(page.id)}
        onPageCollapseToggle={onPageCollapseToggle}
      />
    );
  }
};

export default FlexibleEditorLayout;