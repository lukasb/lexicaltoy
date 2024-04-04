import { useContext, useEffect } from 'react';
import { PagesContext } from '@/app/context/pages-context';
import { updatePageContentsWithHistory } from "../lib/actions";
import { Page } from "@/app/lib/definitions";
import { useSharedNodeContext } from '../context/shared-node-context';

// TODO maybe use Redux so we don't have an O(n) operation here every time
function PagesManager({ setPages }: { setPages: React.Dispatch<React.SetStateAction<Page[]>> }) {
  const pages = useContext(PagesContext);
  const { sharedNodeMap } = useSharedNodeContext();

  useEffect(() => {
    const savePagesToDatabase = async () => {
      for (const page of pages) {
        if (page.pendingWrite) {
          console.log("Saving page to database", page.title);
          try {
            const newRevisionNumber = await updatePageContentsWithHistory(page.id, page.value, page.revisionNumber);
            if (newRevisionNumber === -1) {
              alert("Failed to save page because you edited an old version, please relead for the latest version.");
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
    };

    savePagesToDatabase();
  }, [pages, setPages]);

  // TODO maybe use Redux so we don't have an O(n) operation here every time
  useEffect(() => {
    for (const [key, value] of sharedNodeMap.entries()) {
      const [pageName, lineNumber] = key.split("-");
      const page = pages.find((p) => p.title === pageName);
      if (page) {
        const lines = page.value.split("\n");
        const line = lines[parseInt(lineNumber) - 1];
        if (!line || line !== value.output.nodeMarkdown) {
          const updatedLine = value.output.nodeMarkdown;
          // TODO this will break if we've added a new node/line
          lines[parseInt(lineNumber) - 1] = updatedLine;
          const updatedPage = lines.join("\n");
          setPages((prevPages) =>
            prevPages.map((p) => (p.title === pageName ? { ...p, value: updatedPage, pendingWrite: true } : p))
          );
        }
      }
    }
  }, [sharedNodeMap, pages, setPages]);

  return null;
}

export default PagesManager;