import {
  DEFAULT_NONJOURNAL_PAGE_VALUE,
  ConflictErrorCode,
  Page,
} from "@/lib/definitions";
import {
  getQueuedUpdateById,
  deleteQueuedUpdate,
  insertPage,
  PageSyncResult,
  deletePage
} from "@/_app/context/storage/storage-context";
import { DEFAULT_JOURNAL_CONTENTS } from "@/lib/journal-helpers";

export interface ConflictManagerDeps {
  removePageUpdate: (pageId: string) => void;
  pages: Page[];
  userId: string;
}

function findUnusedTitle(startTitle: string, pages: Page[]): string {
  // if startTitle is already unused, return it
  if (!pages.find(page => page.title === startTitle)) {
    return startTitle;
  }
  // otherwise, find the next unused title
  for (let i = 1; i < 1000; i++) {
    const title = `${startTitle} (conflict) ${i}`;
    if (!pages.find(page => page.title === title)) {
      return title;
    }
  }
  // if we've exhausted the range, return a random UUID
  return crypto.randomUUID();
}

export function createConflictHandler(deps: ConflictManagerDeps) {
  return async function handleConflict(
    pageId: string,
    errorCode: ConflictErrorCode
  ): Promise<void> {
    const {
      removePageUpdate,
      pages,
      userId,
    } = deps;
    const queuedUpdate = await getQueuedUpdateById(pageId);
    if (queuedUpdate) {
      if (errorCode === ConflictErrorCode.NotFound && queuedUpdate.deleted) {
        try {
          console.log("queued delete does not exist on server, removing");
          removePageUpdate(pageId);
          await deletePage(pageId);
          await deleteQueuedUpdate(pageId);
        } catch (error) {
          console.error("error handling queued delete of page that does not exist on server", error);
        }
      }
      else if (
        queuedUpdate.isJournal &&
        queuedUpdate.value === DEFAULT_JOURNAL_CONTENTS
      ) {
        console.log("queued update with conflict is journal page with default value, removing");
        removePageUpdate(pageId);
        await deleteQueuedUpdate(pageId);
      } else if (
        !queuedUpdate.isJournal &&
        errorCode === ConflictErrorCode.UniquenessViolation &&
        queuedUpdate.value === DEFAULT_NONJOURNAL_PAGE_VALUE
      ) {
        console.log("queued update violating uniqueness constraint is non-journal page with default value, removing");
        alert("A page with this title already exists. Please use a different title.");
        removePageUpdate(pageId);
        await deleteQueuedUpdate(pageId);
      } else {
        console.log("queued update with conflict is non-journal page with non-default value, adding conflict page");
        removePageUpdate(pageId);
        const newTitle = findUnusedTitle(queuedUpdate.title, pages);
        await deleteQueuedUpdate(pageId);
        const [newPage, result] = await insertPage(newTitle, queuedUpdate.value, userId, queuedUpdate.isJournal);
        if (result === PageSyncResult.Success) {
          console.log("successfully inserted conflict page");
        } else {
          console.error("failed to insert conflict page");
        }
      }
    }
  };
}
