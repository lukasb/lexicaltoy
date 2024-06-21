import { useContext, useEffect, useRef } from 'react';
import { PagesContext } from '@/_app/context/pages-context';
import { updatePageContentsWithHistory } from "@/lib/db";
import { Page, PageStatus } from "@/lib/definitions";
import { 
  useSharedNodeContext,
  SharedNodeKeyElements,
  getSharedNodeKeyElements
} from '../_app/context/shared-node-context';
import { useFormulaResultService } from './formula/FormulaResultService';
import { isDevelopmentEnvironment } from "@/lib/environment";
import { useCallback } from "react";

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager({ setPages }: { setPages: React.Dispatch<React.SetStateAction<Page[]>> }) {
  const pages = useContext(PagesContext);
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();
  const { getFormulaResults, updatePagesResults } = useFormulaResultService();
  
  // Create a ref to store the save queue
  const saveQueue = useRef<Map<string, { page: Page, timestamp: number }>>(new Map());
  const isSaving = useRef<Set<string>>(new Set());

  const savePagesToDatabase = useCallback(async () => {
    for (const [pageId, { page, timestamp }] of saveQueue.current.entries()) {
      if (isSaving.current.has(pageId)) continue;

      isSaving.current.add(pageId);
      if (isDevelopmentEnvironment) console.time(`savePage_${pageId}`);

      try {
        const { revisionNumber, lastModified } = await updatePageContentsWithHistory(page.id, page.value, page.revisionNumber);
        if (isDevelopmentEnvironment) console.timeEnd(`savePage_${pageId}`);

        if (revisionNumber === -1 || !revisionNumber || !lastModified) {
          alert(`Failed to save page ${page.title} because you edited an old version, please reload for the latest version.`);
        } else {
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.id === page.id ? { ...p, status: PageStatus.Quiescent, revisionNumber: revisionNumber, lastModified: lastModified } : p
            )
          );
        }
      } catch (error) {
        alert(`Failed to save page ${page.title}`);
      } finally {
        isSaving.current.delete(pageId);
        saveQueue.current.delete(pageId);
      }
    }
  }, [setPages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveQueue.current.size > 0) {
        savePagesToDatabase();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [savePagesToDatabase]);

  useEffect(() => {
    pages.forEach(page => {
      if (page.status === PageStatus.PendingWrite) {
        const currentTimestamp = Date.now();
        const existingSave = saveQueue.current.get(page.id);

        if (!existingSave || existingSave.timestamp < currentTimestamp) {
          saveQueue.current.set(page.id, { page, timestamp: currentTimestamp });
        }
      }
    });
  }, [pages]);

  // TODO maybe use Redux or some kind of message bus so we don't have an O(n) operation here every time
  // TODO make this async

  useEffect(() => {

    // If shared nodes have been updated, update the pages
    // If pages have been updated, invalidate their shared nodes

    const pagesToUpdate = new Map<string, string>();

    for (const [key, value] of sharedNodeMap.entries()) {
      const keyElements: SharedNodeKeyElements = getSharedNodeKeyElements(key);
      const page = pages.find((p) => p.title === keyElements.pageName);
      if (page) {
        const lines = page.value.split("\n");
        if (lines.slice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd).join("\n") !== value.output.nodeMarkdown) {
          lines.splice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd - keyElements.lineNumberStart + 1, ...value.output.nodeMarkdown.split("\n"));
        }
        if (page.status !== PageStatus.UserEdit && value.needsSyncToPage) {
          pagesToUpdate.set(keyElements.pageName, lines.join("\n"));
          sharedNodeMap.set(key, { ...value, needsSyncToPage: false });
        } else if (page.status === PageStatus.UserEdit && value.needsSyncToPage) {
          console.error("Page has a user edit, but shared node also needs sync to page");
        } 
      }
    }
    const pagesToInvalidate: Page[] = pages.filter(page => page.status === PageStatus.UserEdit);
    if (pagesToInvalidate.length > 0) {
      // get new formula results for pages that have changed
      updatePagesResults(pagesToInvalidate);
    }
    if (pagesToUpdate.size > 0) {
      // update pages that have shared nodes that have changed
      for (const [pageName, updatedPage] of pagesToUpdate.entries()) {
        const page = pages.find((p) => p.title === pageName);
        if (page) {
          console.log("Updating page", page.title);
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.id === page.id ? { ...p, value: updatedPage, status: PageStatus.EditFromSharedNodes } : p
            )
          );
        }
      }
    }
    for (const page of pages) {
      if (!pagesToUpdate.has(page.title)) {
        if (page.status === PageStatus.UserEdit || page.status === PageStatus.EditFromSharedNodes) {
          console.log("Setting page to pending write", page.title);
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.id === page.id ? { ...p, status: PageStatus.PendingWrite } : p
            )
          );
        }
      }
    }
  }, [sharedNodeMap, setSharedNodeMap, pages, setPages, updatePagesResults]);

  return null;
}

export default PagesManager;