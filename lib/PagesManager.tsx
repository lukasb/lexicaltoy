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
import { getNodeElementFullMarkdown } from '@/lib/formula/formula-definitions';
import { useMiniSearch } from '@/_app/context/minisearch-context';

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager({ setPages }: { setPages: React.Dispatch<React.SetStateAction<Page[]>> }) {
  const pages = useContext(PagesContext);
  const { sharedNodeMap } = useSharedNodeContext();
  const { updatePagesResults, addPagesResults } = useFormulaResultService();
  const { msReplacePage } = useMiniSearch();
  
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
          msReplacePage(page);
        }
      } catch (error) {
        alert(`Failed to save page ${page.title} - ${error}`);
      } finally {
        isSaving.current.delete(pageId);
        saveQueue.current.delete(pageId);
      }
    }
  }, [setPages, msReplacePage]);

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
    // (we avoid circularity by tracking the shared node that was the source of the update)

    const pagesToUpdate = new Map<string, string>();

    for (const [key, value] of sharedNodeMap.entries()) {
      const keyElements: SharedNodeKeyElements = getSharedNodeKeyElements(key);
      const page = pages.find((p) => p.title === keyElements.pageName);
      if (page) {
        if (page.status !== PageStatus.UserEdit && value.needsSyncToPage) {
          const lines = page.value.split("\n");
          const currentMarkdown = getNodeElementFullMarkdown(value.output);
          if (lines.slice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd).join("\n") !== currentMarkdown) {
            lines.splice(keyElements.lineNumberStart - 1, keyElements.lineNumberEnd - keyElements.lineNumberStart + 1, ...currentMarkdown.split("\n"));
          }
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
      const updatedPages = pages.map(p => {
        const updatedPage = pagesToUpdate.get(p.title);
        if (updatedPage) {
          console.log("updating page value - PagesManager", p.title);
          return { ...p, value: updatedPage, status: PageStatus.EditFromSharedNodes };
        }
        return p;
      });
    
      setPages(updatedPages);
    
      // this kicks off a codepath that attempts to append newly matching nodes to existing
      // FormulaDisplayNodes with node queries, without otherwise affecting them (i.e. not removing or changing existing nodes)
      const filteredUpdatedPages = updatedPages.filter((p) => p.status === PageStatus.EditFromSharedNodes);
      addPagesResults(filteredUpdatedPages);
    }
    for (const page of pages) {
      if (!pagesToUpdate.has(page.title)) {
        if (page.status === PageStatus.UserEdit || page.status === PageStatus.EditFromSharedNodes) {
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.id === page.id ? { ...p, status: PageStatus.PendingWrite } : p
            )
          );
        }
      }
    }
  }, [sharedNodeMap, pages, setPages, updatePagesResults, addPagesResults]);

  return null;
}

export default PagesManager;