import { useContext, useEffect } from 'react';
import { PagesContext } from '@/app/context/pages-context';
import { updatePageContentsWithHistory } from "../lib/actions";
import { Page, PageStatus } from "@/app/lib/definitions";
import { 
  useSharedNodeContext,
  SharedNodeKeyElements,
  getSharedNodeKeyElements
} from '../context/shared-node-context';
import { useDebouncedCallback } from "use-debounce";
import { useFormulaResultService } from './FormulaResultService';
import { isDevelopmentEnvironment } from "../lib/environment";

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager({ setPages }: { setPages: React.Dispatch<React.SetStateAction<Page[]>> }) {
  const pages = useContext(PagesContext);
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();
  const { getFormulaResults, updatePagesResults } = useFormulaResultService();

  const savePagesToDatabase = useDebouncedCallback(async () => {
    for (const page of pages) {
      if (page.status === PageStatus.PendingWrite) {
        if (isDevelopmentEnvironment) console.time("savePage");
        try {
          const newRevisionNumber = await updatePageContentsWithHistory(page.id, page.value, page.revisionNumber);
          if (isDevelopmentEnvironment) console.timeEnd("savePage");
          if (newRevisionNumber === -1) {
            alert(`Failed to save page ${page.title} because you edited an old version, please relead for the latest version.`);
            return;
          }
          // Update the pages context with the new revision number
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.id === page.id ? { ...p, status: PageStatus.Quiescent, revisionNumber: newRevisionNumber } : p
            )
          );
        } catch (error) {
          alert("Failed to save page");
        }
      }
    }
  }, 500);

  useEffect(() => {
    savePagesToDatabase();
  }, [pages, setPages, savePagesToDatabase]);

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