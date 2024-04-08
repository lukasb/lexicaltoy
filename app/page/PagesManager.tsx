import { useContext, useEffect, useCallback } from 'react';
import { PagesContext } from '@/app/context/pages-context';
import { updatePageContentsWithHistory } from "../lib/actions";
import { Page } from "@/app/lib/definitions";
import { useSharedNodeContext } from '../context/shared-node-context';
import { useDebouncedCallback } from "use-debounce";

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager({ setPages }: { setPages: React.Dispatch<React.SetStateAction<Page[]>> }) {
  const pages = useContext(PagesContext);
  const { sharedNodeMap, setSharedNodeMap } = useSharedNodeContext();

  const savePagesToDatabase = useDebouncedCallback(async () => {
    for (const page of pages) {
      if (page.pendingWrite) {
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
              p.id === page.id ? { ...p, pendingWrite: false, revisionNumber: newRevisionNumber } : p
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

  const invalidatePageResults = useCallback((pageNames: Set<string>) => {

    setSharedNodeMap((prevMap) => {
      const updatedMap = new Map(prevMap);
      for (const [key, value] of updatedMap.entries()) {
        const pageName = key.split("-")[0];
        if (pageNames.has(pageName)) {
          updatedMap.delete(key);
        }
      }

      // we need to go get the updated stuff here, FDC just takes the shared node map as gospel

      return updatedMap;
    });

  }, [setSharedNodeMap]);

  // TODO maybe use Redux so we don't have an O(n) operation here every time
  useEffect(() => {
    const pagesToInvalidate = new Set<string>();
    for (const [key, value] of sharedNodeMap.entries()) {
      const [pageName, lineNumber] = key.split("-");
      const page = pages.find((p) => p.title === pageName);
      if (page) {
        const lines = page.value.split("\n");
        const line = lines[parseInt(lineNumber) - 1];
        if (!line || line !== value.output.nodeMarkdown) {
          if (page.pendingWrite === false) {
            const updatedLine = value.output.nodeMarkdown;
            // TODO this will break if we've added a new node/line
            lines[parseInt(lineNumber) - 1] = updatedLine;
            const updatedPage = lines.join("\n");
            setPages((prevPages) =>
              prevPages.map((p) => (p.title === pageName ? { ...p, value: updatedPage, pendingWrite: true } : p))
            );
          } else {
            pagesToInvalidate.add(pageName);
          }
        }
      }
    }
    invalidatePageResults(pagesToInvalidate);
  }, [sharedNodeMap, setSharedNodeMap, pages, setPages, invalidatePageResults]);

  return null;
}

export default PagesManager;