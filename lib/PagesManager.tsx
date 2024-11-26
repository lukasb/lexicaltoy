import { useContext, useEffect, useRef } from 'react';
import { PagesContext } from '@/_app/context/pages-context';
import { Page, PageStatus } from "@/lib/definitions";
import { 
  useSharedNodeContext,
  SharedNodeKeyElements,
  getSharedNodeKeyElements
} from '../_app/context/shared-node-context';
import { useFormulaResultService } from './formula/FormulaResultService';
import { useCallback } from "react";
import { getNodeElementFullMarkdown } from '@/lib/formula/formula-definitions';
import { useMiniSearch } from '@/_app/context/minisearch-context';
import { updatePage, PageSyncResult, deleteQueuedUpdate } from '@/_app/context/storage/storage-context';
import { usePageStatus } from '@/_app/context/page-update-context';

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager() {
  const pages = useContext(PagesContext);
  const { sharedNodeMap } = useSharedNodeContext();
  const { updatePagesResults, addPagesResults } = useFormulaResultService();
  const { msReplacePage } = useMiniSearch();
  const { setPageStatus, removePageStatus, addPageStatus, pageStatuses, setPageLastModified } = usePageStatus();
  
  // Create a ref to store the save queue
  const saveQueue = useRef<Map<string, { page: Page, timestamp: number, newValue: string }>>(new Map());
  const isSaving = useRef<Set<string>>(new Set());

  const savePagesToDatabase = useCallback(async () => {
    for (const [pageId, { page, timestamp, newValue }] of saveQueue.current.entries()) {
      if (isSaving.current.has(pageId)) continue;

      isSaving.current.add(pageId);

      try {
        const result = await updatePage({...page, lastModified: new Date(timestamp)}, newValue, page.title, false);
        if (result === PageSyncResult.Conflict) {
          console.log("conflict", page.title);
          setPageStatus(page.id, PageStatus.Conflict);
        } else if (result === PageSyncResult.Error) {
          alert(`Error saving page ${page.title}`);
        } else {
          //removePageStatus(page.id);
          setPageStatus(page.id, PageStatus.Quiescent);
          msReplacePage(page);
        }
      } catch (error) {
        alert(`Failed to save page ${page.title} - ${error}`);
      } finally {
        isSaving.current.delete(pageId);
        saveQueue.current.delete(pageId);
      }
    }
  }, [msReplacePage, setPageStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveQueue.current.size > 0) {
        savePagesToDatabase();
      }
    }, 10);

    return () => clearInterval(interval);
  }, [savePagesToDatabase]);

  useEffect(() => {
    pages.forEach((page) => {
      const pageStatus = pageStatuses.get(page.id);
      if (
        pageStatus &&
        pageStatus.status === PageStatus.PendingWrite &&
        pageStatus.newValue
      ) {
        const existingSave = saveQueue.current.get(page.id);
        if (!existingSave) {
          saveQueue.current.set(page.id, {
            page,
            timestamp: pageStatus.lastModified.getTime(),
            newValue: pageStatus.newValue,
          });
        }
      } else if (
        pageStatus &&
        pageStatus.status === PageStatus.PendingWrite &&
        !pageStatus.newValue
      ) {
        console.error("Pending write is missing value", page.title);
      } else if (
        pageStatus &&
        pageStatus.status === PageStatus.DroppingUpdate
      ) {
        deleteQueuedUpdate(page.id);
        setTimeout(  // make sure PageListener gets the updated page
          () => setPageStatus(page.id, PageStatus.EditorUpdateRequested),
        0);
      } else if (
        !pageStatus ||
        (page.revisionNumber === pageStatus.revisionNumber &&
          page.lastModified > pageStatus.lastModified)
      ) {
        // this is probably a page updated by another tab
        console.log(
          "page updated by another tab, I think",
          !pageStatus,
          !pageStatus?.lastModified,
          page.lastModified > (pageStatus?.lastModified || 0),
          pageStatus?.lastModified
        );
        addPageStatus(page.id, PageStatus.UpdatedFromDisk, page.lastModified, page.revisionNumber, page.value);
      } else if (page.revisionNumber > pageStatus.revisionNumber) {
        if (
          pageStatus.status === PageStatus.UserEdit ||
          pageStatus.status === PageStatus.EditFromSharedNodes ||
          pageStatus.status === PageStatus.PendingWrite
        ) {
          console.log("page updated on server but edited, conflict", page.title);
          addPageStatus(
            page.id,
            PageStatus.Conflict,
            page.lastModified,
            page.revisionNumber,
            page.value
          );
        } else {
          console.log("page updated on server, load new content", page.title);
          addPageStatus(page.id, PageStatus.UpdatedFromDisk, page.lastModified, page.revisionNumber, page.value);
        }
      }
    });
  }, [pages, pageStatuses, setPageStatus, addPageStatus, setPageLastModified]);

  // TODO maybe use Redux or some kind of message bus so we don't have an O(n) operation here every time
  // TODO make this async

  useEffect(() => {

    // If shared nodes have been updated, update the pages
    // If pages have been updated, invalidate their shared nodes
    // (we avoid circularity by tracking the shared node that was the source of the update)

    const pagesToUpdate = new Map<string, string>();

    for (const [key, value] of sharedNodeMap.entries()) {
      const keyElements: SharedNodeKeyElements = getSharedNodeKeyElements(key);
      const page = pages.find((p) => p.title === keyElements.pageName);
      if (page) {
        if (pageStatuses.get(page.id)?.status !== PageStatus.UserEdit && value.needsSyncToPage) {
          const lines = page.value.split("\n");
          const currentMarkdown = getNodeElementFullMarkdown(value.output);
          if (lines.slice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd).join("\n") !== currentMarkdown) {
            lines.splice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd - keyElements.lineNumberStart + 1, ...currentMarkdown.split("\n"));
          }
          pagesToUpdate.set(keyElements.pageName, lines.join("\n"));
          sharedNodeMap.set(key, { ...value, needsSyncToPage: false });
        } else if (pageStatuses.get(page.id)?.status === PageStatus.UserEdit && value.needsSyncToPage) {
          console.error("Page has a user edit, but shared node also needs sync to page");
        } 
      }
    }
    const pagesToInvalidate = pages
      .filter(page => pageStatuses.get(page.id)?.status === PageStatus.UserEdit || pageStatuses.get(page.id)?.status === PageStatus.UpdatedFromDisk)
      .map(page => ({
        ...page,
        value: pageStatuses.get(page.id)?.newValue || page.value
      }));

    if (pagesToInvalidate.length > 0) {
      console.log("PagesManager updating pages results for pages", pagesToInvalidate.map(p => p.title));
      updatePagesResults(pagesToInvalidate);
    }
    if (pagesToUpdate.size > 0) {
      // update pages that have shared nodes that have changed
      const updatedPages = pages.map(p => {
        const updatedPageContents = pagesToUpdate.get(p.title);
        if (updatedPageContents) {
          addPageStatus(p.id, PageStatus.EditFromSharedNodes, new Date(), p.revisionNumber, updatedPageContents);
        }
        return p;
      });
    
      // this kicks off a codepath that attempts to append newly matching nodes to existing
      // FormulaDisplayNodes with node queries, without otherwise affecting them (i.e. not removing or changing existing nodes)
      const filteredUpdatedPages = updatedPages.filter((p) => pageStatuses.get(p.id)?.status === PageStatus.EditFromSharedNodes);
      if (filteredUpdatedPages.length > 0) {
        addPagesResults(filteredUpdatedPages);
      }
    }
    for (const page of pages) {
      if (!pagesToUpdate.has(page.title)) {
        if (pageStatuses.get(page.id)?.status === PageStatus.UserEdit || pageStatuses.get(page.id)?.status === PageStatus.EditFromSharedNodes) {
          setPageStatus(page.id, PageStatus.PendingWrite);
        } else if (pageStatuses.get(page.id)?.status === PageStatus.UpdatedFromDisk) {
          setPageStatus(page.id, PageStatus.EditorUpdateRequested);
        } else if (pageStatuses.get(page.id)?.status === PageStatus.EditorUpdateRequested) {
          setPageStatus(page.id, PageStatus.Quiescent);
        }
      }
    }
  }, [sharedNodeMap, pages, setPageStatus, updatePagesResults, addPagesResults, pageStatuses, addPageStatus, removePageStatus]);

  return null;
}

export default PagesManager;