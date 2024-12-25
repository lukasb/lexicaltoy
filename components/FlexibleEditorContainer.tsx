"use client";

import React, { useCallback } from 'react';
import { useState, useEffect } from 'react';
import { useBreakpoint } from '@/lib/window-helpers';
import EditorContainer from '@/_app/editor/editor-container';
import { Page } from '@/lib/definitions';
import { getJournalPageDate } from '@/lib/journal-helpers';

function FlexibleEditorLayout ({
  openPageIds,
  currentPages,
  closePage,
  openOrCreatePageByTitle,
  pinnedPageIds,
  onPagePinToggle,
  collapsedPageIds,
  onPageCollapseToggle,
  topPageId
}: {
  openPageIds: string[];
  currentPages: Page[];
  closePage: (id: string) => void;
  openOrCreatePageByTitle: (title: string) => void;
  pinnedPageIds: string[];
  onPagePinToggle: (pageId: string) => void;
  collapsedPageIds: string[];
  onPageCollapseToggle: (pageId: string) => void;
  topPageId?: string;
}) {

  const [isSmallWidthViewport, setIsSmallWidthViewport] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useBreakpoint(1537, isSmallWidthViewport, setIsSmallWidthViewport);

  const sortPages = useCallback((pageIds: string[], topPageId?: string): { pinnedIds: string[], unpinnedIds: string[] } => {
    
    if (pageIds.length === 0 && topPageId === undefined) return { pinnedIds: [], unpinnedIds: [] };

    // Get all relevant page IDs including topPageId
    const allPageIds = topPageId !== undefined ? [...new Set([topPageId, ...pageIds])] : pageIds;
    
    const pages = allPageIds
      .map(id => currentPages.find(p => p.id === id))
      .filter(p => p !== undefined) as Page[];
    
    if (pages.length === 0) return { pinnedIds: [], unpinnedIds: [] };

    // Separate pinned and unpinned pages
    const pinnedPages = pages.filter(p => pinnedPageIds.includes(p.id));
    const unpinnedPages = pages.filter(p => !pinnedPageIds.includes(p.id));

    // Sort unpinned pages
    const journalPages = unpinnedPages.filter(p => p.isJournal);
    const nonJournalPages = unpinnedPages.filter(p => !p.isJournal);

    // Sort journal pages by their date
    const sortedJournalPages = journalPages.sort((a, b) => {
      const dateA = getJournalPageDate(a);
      const dateB = getJournalPageDate(b);
      return dateB.getTime() - dateA.getTime();
    });

    // Sort non-journal pages by lastModified
    const sortedNonJournalPages = nonJournalPages.sort((a, b) => {
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });

    // Merge journal and non-journal pages in reverse chronological order
    const sortedUnpinnedPages: Page[] = [];
    let journalIndex = 0;
    let nonJournalIndex = 0;

    while (journalIndex < sortedJournalPages.length || nonJournalIndex < sortedNonJournalPages.length) {
      const journalPage = sortedJournalPages[journalIndex];
      const nonJournalPage = sortedNonJournalPages[nonJournalIndex];

      if (!journalPage) {
        sortedUnpinnedPages.push(nonJournalPage);
        nonJournalIndex++;
      } else if (!nonJournalPage) {
        sortedUnpinnedPages.push(journalPage);
        journalIndex++;
      } else {
        const journalDate = new Date(journalPage.lastModified);
        const nonJournalDate = new Date(nonJournalPage.lastModified);

        if (journalDate.getTime() > nonJournalDate.getTime()) {
          sortedUnpinnedPages.push(journalPage);
          journalIndex++;
        } else {
          sortedUnpinnedPages.push(nonJournalPage);
          nonJournalIndex++;
        }
      }
    }

    const topPage = pages.find(p => p.id === topPageId);
    const firstPage = topPage || sortedUnpinnedPages[0] || pinnedPages[0];
    if (!firstPage) return { pinnedIds: [], unpinnedIds: [] };

    const remainingPinnedPages = pinnedPages.filter(p => p.id !== firstPage.id);
    const remainingUnpinnedPages = sortedUnpinnedPages.filter(p => p.id !== firstPage.id);

    const pinnedIds = pinnedPageIds.includes(firstPage.id)
      ? [firstPage.id, ...remainingPinnedPages.map(p => p.id)]
      : remainingPinnedPages.map(p => p.id);
    
    const unpinnedIds = !pinnedPageIds.includes(firstPage.id)
      ? [firstPage.id, ...remainingUnpinnedPages.map(p => p.id)]
      : remainingUnpinnedPages.map(p => p.id);

    return {
      pinnedIds,
      unpinnedIds
    };
  }, [currentPages, pinnedPageIds]);

  const [sortedPages, setSortedPages] = useState<{ pinnedIds: string[], unpinnedIds: string[] }>(() => sortPages(openPageIds, topPageId));

  useEffect(() => {
    if (isLoading) {
      setSortedPages(sortPages(openPageIds, topPageId));
      setIsLoading(false);
    } else {
      setSortedPages(prevSorted => {
        // Get all current IDs
        const currentIds = [...prevSorted.pinnedIds, ...prevSorted.unpinnedIds];
        
        // Remove closed pages
        let newIds = currentIds.filter(id => openPageIds.includes(id));
        
        // Add any new pages
        const newPageIds = openPageIds.filter(id => 
          !newIds.includes(id) && id !== topPageId
        );
        
        return sortPages([...newIds, ...newPageIds], topPageId);
      });
    }
  }, [openPageIds, currentPages, isLoading, topPageId, sortPages]);

  if (isLoading || !sortedPages || (sortedPages.pinnedIds.length === 0 && sortedPages.unpinnedIds.length === 0)) {
    return <div>Loading...</div>;
  }

  if (isSmallWidthViewport) {
    // Get the first unpinned page, followed by pinned pages, then remaining unpinned pages
    const firstUnpinnedPage = sortedPages.unpinnedIds[0];
    const remainingUnpinnedPages = sortedPages.unpinnedIds.slice(1);
    const allSortedIds = firstUnpinnedPage 
      ? [firstUnpinnedPage, ...sortedPages.pinnedIds, ...remainingUnpinnedPages]
      : [...sortedPages.pinnedIds, ...remainingUnpinnedPages];
    return (
      <div className="grid grid-cols-1 gap-4">
        {allSortedIds.map((pageId, index) => renderEditorContainer(pageId, index === 0))}
      </div>
    );
  } else {
    const leftColumnPages: string[] = [];
    const rightColumnPages: string[] = [...sortedPages.pinnedIds];

    sortedPages.unpinnedIds.forEach((pageId, index) => {
      if (index % 2 === 0) {
        leftColumnPages.push(pageId);
      } else {
        rightColumnPages.push(pageId);
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