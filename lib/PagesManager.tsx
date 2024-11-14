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
import { usePageUpdate } from '@/_app/context/page-update-context';

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager() {
  const pages = useContext(PagesContext);
  const { sharedNodeMap } = useSharedNodeContext();
  const { updatePagesResults, addPagesResults } = useFormulaResultService();
  const { msReplacePage } = useMiniSearch();
  const { setPageUpdateStatus, removePageUpdate, addPageUpdate, pageUpdates } = usePageUpdate();
  
  // Create a ref to store the save queue
  const saveQueue = useRef<Map<string, { page: Page, timestamp: number, newValue: string }>>(new Map());
  const isSaving = useRef<Set<string>>(new Set());

  const savePagesToDatabase = useCallback(async () => {
    for (const [pageId, { page, timestamp, newValue }] of saveQueue.current.entries()) {
      if (isSaving.current.has(pageId)) continue;

      isSaving.current.add(pageId);

      try {
        const result = await updatePage(page, newValue, page.title, false);
        if (result === PageSyncResult.Conflict) {
          console.log("conflict", page.title);
          setPageUpdateStatus(page.id, PageStatus.Conflict);
        } else if (result === PageSyncResult.Error) {
          alert(`Error saving page ${page.title}`);
        } else {
          removePageUpdate(page.id);
          msReplacePage(page);
        }
      } catch (error) {
        alert(`Failed to save page ${page.title} - ${error}`);
      } finally {
        isSaving.current.delete(pageId);
        saveQueue.current.delete(pageId);
      }
    }
  }, [msReplacePage, removePageUpdate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveQueue.current.size > 0) {
        savePagesToDatabase();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [savePagesToDatabase]);

  useEffect(() => {
    pages.forEach(page => {
      const pageUpdate = pageUpdates.get(page.id);
      if (pageUpdate && pageUpdate.status === PageStatus.PendingWrite && pageUpdate.newValue) {
        const currentTimestamp = Date.now();
        const existingSave = saveQueue.current.get(page.id);

        if (!existingSave || existingSave.timestamp < currentTimestamp) {
          saveQueue.current.set(page.id, { page, timestamp: currentTimestamp, newValue: pageUpdate.newValue });
        }
      } else if (pageUpdate && pageUpdate.status === PageStatus.DroppingUpdate) {
        deleteQueuedUpdate(page.id);
        setTimeout(() => setPageUpdateStatus(page.id, PageStatus.EditorUpdateRequested), 0); // make sure PageListener gets the updated page
      }
    });
  }, [pages, pageUpdates]);

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
        if (pageUpdates.get(page.id)?.status !== PageStatus.UserEdit && value.needsSyncToPage) {
          const lines = page.value.split("\n");
          const currentMarkdown = getNodeElementFullMarkdown(value.output);
          if (lines.slice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd).join("\n") !== currentMarkdown) {
            lines.splice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd - keyElements.lineNumberStart + 1, ...currentMarkdown.split("\n"));
          }
          pagesToUpdate.set(keyElements.pageName, lines.join("\n"));
          sharedNodeMap.set(key, { ...value, needsSyncToPage: false });
        } else if (pageUpdates.get(page.id)?.status === PageStatus.UserEdit && value.needsSyncToPage) {
          console.error("Page has a user edit, but shared node also needs sync to page");
        } 
      }
    }
    const pagesToInvalidate = pages
      .filter(page => pageUpdates.get(page.id)?.status === PageStatus.UserEdit)
      .map(page => ({
        ...page,
        value: pageUpdates.get(page.id)?.newValue || page.value
      }));

    if (pagesToInvalidate.length > 0) {
      updatePagesResults(pagesToInvalidate);
    }
    if (pagesToUpdate.size > 0) {
      // update pages that have shared nodes that have changed
      const updatedPages = pages.map(p => {
        const updatedPageContents = pagesToUpdate.get(p.title);
        if (updatedPageContents) {
          addPageUpdate(p.id, PageStatus.EditFromSharedNodes, new Date(), updatedPageContents);
        }
        return p;
      });
    
      // this kicks off a codepath that attempts to append newly matching nodes to existing
      // FormulaDisplayNodes with node queries, without otherwise affecting them (i.e. not removing or changing existing nodes)
      const filteredUpdatedPages = updatedPages.filter((p) => pageUpdates.get(p.id)?.status === PageStatus.EditFromSharedNodes);
      addPagesResults(filteredUpdatedPages);
    }
    for (const page of pages) {
      if (!pagesToUpdate.has(page.title)) {
        if (pageUpdates.get(page.id)?.status === PageStatus.UserEdit || pageUpdates.get(page.id)?.status === PageStatus.EditFromSharedNodes) {
          setPageUpdateStatus(page.id, PageStatus.PendingWrite);
        } else if (pageUpdates.get(page.id)?.status === PageStatus.EditorUpdateRequested) {
          removePageUpdate(page.id);
        }
      }
    }
  }, [sharedNodeMap, pages, setPageUpdateStatus, updatePagesResults, addPagesResults, pageUpdates]);

  return null;
}

export default PagesManager;