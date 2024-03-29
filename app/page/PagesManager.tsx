import { useContext, useEffect } from 'react';
import { PagesContext } from '@/app/context/pages-context';
import { updatePageContentsWithHistory } from "../lib/actions";
import { Page } from "@/app/lib/definitions";

function PagesManager({ setPages }: { setPages: React.Dispatch<React.SetStateAction<Page[]>> }) {
  const pages = useContext(PagesContext);

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

  return null;
}

export default PagesManager;