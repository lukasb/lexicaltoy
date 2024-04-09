import { useContext, useEffect, useCallback } from 'react';
import { PagesContext } from '@/app/context/pages-context';
import { updatePageContentsWithHistory } from "../lib/actions";
import { Page, PageStatus } from "@/app/lib/definitions";
import { useSharedNodeContext } from '../context/shared-node-context';
import { useDebouncedCallback } from "use-debounce";
import { useFormulaResultService } from './FormulaResultService';

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager({ setPages }: { setPages: React.Dispatch<React.SetStateAction<Page[]>> }) {
  const pages = useContext(PagesContext);
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();
  const { getFormulaResults, updatePagesResults } = useFormulaResultService();

  const savePagesToDatabase = useDebouncedCallback(async () => {
    for (const page of pages) {
      if (page.status === PageStatus.PendingWrite) {
        console.log("Saving page to database", page.title);
        try {
          const newRevisionNumber = await updatePageContentsWithHistory(page.id, page.value, page.revisionNumber);
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

    console.log("checking for updates to shared nodes and pages");

    // If shared nodes have been updated, update the pages
    // If pages have been updated, invalidate their shared nodes

    const pagesToInvalidate = new Set<string>();
    const pagesToUpdate = new Map<string, string>();

    for (const [key, value] of sharedNodeMap.entries()) {
      const [pageName, lineNumber] = key.split("-");
      const page = pages.find((p) => p.title === pageName);
      if (page) {
        const lines = page.value.split("\n");
        const line = lines[parseInt(lineNumber) - 1];
        if (!line || line !== value.output.nodeMarkdown) {
          if (page.status !== PageStatus.UserEdit && value.needsSyncToPage) {
            const updatedLine = value.output.nodeMarkdown;
            // TODO this will break if we've added a new node/line
            lines[parseInt(lineNumber) - 1] = updatedLine;
            const updatedPage = lines.join("\n");
            pagesToUpdate.set(pageName, updatedPage);
            sharedNodeMap.set(key, { ...value, needsSyncToPage: false });
          } else if (page.status === PageStatus.UserEdit && value.needsSyncToPage) {
            console.error("Page has a user edit, but shared node also needs sync to page");
          } else if (page.status === PageStatus.UserEdit) {
            pagesToInvalidate.add(pageName);
          }
        }
      }
    }
    if (pagesToInvalidate.size > 0) {
      console.log("updating formula results based on page edits", pagesToInvalidate);
      updatePagesResults(pagesToInvalidate);
    }
    if (pagesToUpdate.size > 0) {
      console.log("updating pages based on shared node updates", pagesToUpdate);
      for (const [pageName, updatedPage] of pagesToUpdate.entries()) {
        const page = pages.find((p) => p.title === pageName);
        if (page) {
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.id === page.id ? { ...p, value: updatedPage, status: PageStatus.PendingWrite } : p
            )
          );
        }
      }
    }
    for (const page of pages) {
      if (!pagesToUpdate.has(page.title)) {
        // these are either pages we invalidated or pages that didn't have any shared nodes that had a user edit
        if (page.status === PageStatus.UserEdit) {
          console.log('allowing user edit to be written to disk', page.title);
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