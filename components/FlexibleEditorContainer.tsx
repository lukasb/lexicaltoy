"use client";

import React, { useCallback, useRef } from 'react';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const stablePagesOrder = useRef<{ pinnedIds: string[], unpinnedIds: string[] }>({ pinnedIds: [], unpinnedIds: [] });

  useBreakpoint(1537, isSmallWidthViewport, setIsSmallWidthViewport);

  const sortPages = useCallback(
    (
      pageIds: string[],
      topPageId?: string
    ): { pinnedIds: string[]; unpinnedIds: string[] } => {
      const mergeSortedPageIds = (
        journalIds: string[],
        nonJournalIds: string[]
      ): string[] => {
        const merged: string[] = [];
        let journalIndex = 0;
        let nonJournalIndex = 0;

        const getPage = (id: string) => currentPages.find((p) => p.id === id);

        while (
          journalIndex < journalIds.length ||
          nonJournalIndex < nonJournalIds.length
        ) {
          const journalId = journalIds[journalIndex];
          const nonJournalId = nonJournalIds[nonJournalIndex];

          if (!journalId) {
            merged.push(nonJournalId);
            nonJournalIndex++;
          } else if (!nonJournalId) {
            merged.push(journalId);
            journalIndex++;
          } else {
            const journalPage = getPage(journalId);
            const nonJournalPage = getPage(nonJournalId);

            if (!journalPage) {
              console.log("journalPage not found");
              journalIndex++;
              continue;
            }
            if (!nonJournalPage) {
              console.log("nonJournalPage not found");
              nonJournalIndex++;
              continue;
            }

            const journalDate = new Date(journalPage.lastModified);
            const nonJournalDate = new Date(nonJournalPage.lastModified);

            if (journalDate.getTime() > nonJournalDate.getTime()) {
              merged.push(journalId);
              journalIndex++;
            } else {
              merged.push(nonJournalId);
              nonJournalIndex++;
            }
          }
        }

        return merged;
      };

      if (pageIds.length === 0 && topPageId === undefined)
        return { pinnedIds: [], unpinnedIds: [] };

      // Get all relevant page IDs including topPageId
      const allPageIds =
        topPageId !== undefined
          ? [...new Set([topPageId, ...pageIds])]
          : pageIds;

      const pages = allPageIds
        .map((id) => currentPages.find((p) => p.id === id))
        .filter((p) => p !== undefined) as Page[];

      if (pages.length === 0) return { pinnedIds: [], unpinnedIds: [] };

      // Separate pinned and unpinned pages
      const pinnedPages = pages.filter((p) => pinnedPageIds.includes(p.id));
      const unpinnedPages = pages.filter((p) => !pinnedPageIds.includes(p.id));

      // Only sort if this is the initial load
      if (isInitialLoad) {
        // Get IDs of journal and non-journal pages
        const unpinnedIds = unpinnedPages.map((p) => p.id);
        const journalIds = unpinnedIds.filter((id) => {
          const page = currentPages.find((p) => p.id === id);
          return page?.isJournal;
        });
        const nonJournalIds = unpinnedIds.filter((id) => {
          const page = currentPages.find((p) => p.id === id);
          return !page?.isJournal;
        });

        // Sort journal page IDs by their date
        const sortedJournalIds = journalIds.sort((idA, idB) => {
          const pageA = currentPages.find((p) => p.id === idA);
          const pageB = currentPages.find((p) => p.id === idB);
          if (!pageA || !pageB) return 0;
          const dateA = getJournalPageDate(pageA);
          const dateB = getJournalPageDate(pageB);
          return dateB.getTime() - dateA.getTime();
        });

        // Sort non-journal page IDs by lastModified
        const sortedNonJournalIds = nonJournalIds.sort((idA, idB) => {
          const pageA = currentPages.find((p) => p.id === idA);
          const pageB = currentPages.find((p) => p.id === idB);
          if (!pageA || !pageB) return 0;
          return (
            new Date(pageB.lastModified).getTime() -
            new Date(pageA.lastModified).getTime()
          );
        });

        // Merge journal and non-journal page IDs
        const sortedUnpinnedIds = mergeSortedPageIds(
          sortedJournalIds,
          sortedNonJournalIds
        );

        // Handle top page and first page
        const firstPageId =
          topPageId || sortedUnpinnedIds[0] || pinnedPages[0]?.id;
        if (!firstPageId) return { pinnedIds: [], unpinnedIds: [] };

        // If the first page is pinned, it should only appear in pinnedIds
        if (pinnedPageIds.includes(firstPageId)) {
          // Create set of all pinned IDs to ensure uniqueness
          const pinnedSet = new Set([
            firstPageId,
            ...pinnedPages.map((p) => p.id),
          ]);

          return {
            pinnedIds: Array.from(pinnedSet), // Guarantees unique pinned IDs
            unpinnedIds: sortedUnpinnedIds.filter((id) => !pinnedSet.has(id)), // Excludes ALL pinned IDs
          };
        } else {
          // If the first page is unpinned, it should only appear in unpinnedIds
          return {
            pinnedIds: pinnedPages.map((p) => p.id),
            unpinnedIds: [
              firstPageId,
              ...sortedUnpinnedIds.filter((id) => id !== firstPageId),
            ],
          };
        }
      } else {
        // After initial load, maintain the existing order and just handle additions/removals
        const existingPinnedIds = stablePagesOrder.current.pinnedIds;
        const existingUnpinnedIds = stablePagesOrder.current.unpinnedIds;

        // Filter out closed pages
        const currentPinnedIds = existingPinnedIds.filter((id) =>
          pageIds.includes(id)
        );
        const currentUnpinnedIds = existingUnpinnedIds.filter((id) =>
          pageIds.includes(id)
        );

        // Add new pages at the start of unpinned
        const newPageIds = pageIds.filter(
          (id) =>
            !currentPinnedIds.includes(id) &&
            !currentUnpinnedIds.includes(id) &&
            id !== topPageId
        );

        const topPagePinned = pinnedPageIds.includes(topPageId || "");
        
        return {
          pinnedIds: topPagePinned ? currentPinnedIds : currentPinnedIds.filter(id => (id !== topPageId)),
          unpinnedIds: !topPagePinned
            ? [
                ...(topPageId ? [topPageId] : []),
                ...newPageIds,
                ...currentUnpinnedIds.filter((id) => id !== topPageId),
              ]
            : [...newPageIds, ...currentUnpinnedIds],
        };
      }
    },
    [currentPages, pinnedPageIds, isInitialLoad]
  );

  const [sortedPages, setSortedPages] = useState<{ pinnedIds: string[], unpinnedIds: string[] }>(() => {
    const initial = sortPages(openPageIds, topPageId);
    stablePagesOrder.current = initial;
    return initial;
  });

  useEffect(() => {
    if (isInitialLoad) {
      const sorted = sortPages(openPageIds, topPageId);
      stablePagesOrder.current = sorted;
      setSortedPages(sorted);
      setIsInitialLoad(false);
    } else {
      setSortedPages(prevSorted => {
        const sorted = sortPages(openPageIds, topPageId);
        stablePagesOrder.current = sorted;
        return sorted;
      });
    }
  }, [openPageIds, currentPages, isInitialLoad, topPageId, sortPages]);

  if (isInitialLoad || !sortedPages || (sortedPages.pinnedIds.length === 0 && sortedPages.unpinnedIds.length === 0)) {
    return <div>Loading...</div>;
  }

  if (isSmallWidthViewport) {
    console.log("sortedPages", sortedPages.pinnedIds, sortedPages.unpinnedIds);
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
    console.log("sortedPages", sortedPages.pinnedIds, sortedPages.unpinnedIds);
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