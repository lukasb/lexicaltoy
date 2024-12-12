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

    console.log('sorting pages', pageIds);

    if (pageIds.length === 0) return [];
    const pages = pageIds.map(id => currentPages.find(p => p.id === id)).filter(p => p !== undefined) as Page[];
    if (pages.length === 0) return [];

    console.log('pages', pages);

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

    console.log('sortedJournalPages', sortedJournalPages);
    console.log('sortedNonJournalPages', sortedNonJournalPages);

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

        if (nonJournalPage.title === 'horrorday') {
          console.log('journalDate', journalDate);
          console.log('nonJournalDate', nonJournalDate);
        }

        if (journalDate.getTime() > nonJournalDate.getTime()) {
          sortedUnpinnedPages.push(journalPage);
          journalIndex++;
        } else {
          sortedUnpinnedPages.push(nonJournalPage);
          nonJournalIndex++;
        }
      }
    }

    const firstPage = sortedUnpinnedPages[0] || pinnedPages[0];
    if (!firstPage) return [];

    const remainingPinnedPages = pinnedPages.filter(p => p.id !== firstPage.id);
    const remainingUnpinnedPages = sortedUnpinnedPages.filter(p => p.id !== firstPage.id);

    return [
      firstPage.id,
      ...remainingPinnedPages.map(p => p.id),
      ...remainingUnpinnedPages.map(p => p.id)
    ];
  }, [currentPages, pinnedPageIds]);

  const [sortedPageIds, setSortedPageIds] = useState<string[]>(() => sortPages(openPageIds));

  useEffect(() => {
    if (isLoading) {
      setSortedPageIds(sortPages(openPageIds));
      setIsLoading(false);
    } else {
      // Check for closed pages and remove them
      const closedPageIds = sortedPageIds.filter(id => !openPageIds.includes(id));
      if (closedPageIds.length > 0) {
        setSortedPageIds(prevSortedPageIds => 
          prevSortedPageIds.filter(id => openPageIds.includes(id))
        );
      }
      
      // Add new pages to the top
      const newPageIds = openPageIds.filter(id => !sortedPageIds.includes(id));
      if (newPageIds.length > 0) {
        setSortedPageIds(prevSortedPageIds => [...newPageIds, ...prevSortedPageIds]);
      }
    }
  }, [openPageIds, currentPages, sortPages, isLoading, sortedPageIds]);

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