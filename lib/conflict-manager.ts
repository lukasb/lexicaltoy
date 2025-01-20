import {
  DEFAULT_NONJOURNAL_PAGE_VALUE,
  ConflictErrorCode,
  Page,
  PageStatus
} from "@/lib/definitions";
import {
  getQueuedUpdateById,
  deleteQueuedUpdate,
  deletePage
} from "@/_app/context/storage/storage-context";
import { isDefaultValueJournalPage } from "@/lib/journal-helpers";

export interface ConflictManagerDeps {
  removePageStatus: (pageId: string) => void;
  addPageStatus: (
    pageId: string,
    status: PageStatus,
    lastModified: Date,
    revisionNumber: number,
    newValue?: string
  ) => void;
  pages: Page[];
  userId: string;
}

export function createConflictHandler(deps: ConflictManagerDeps) {
  return async function handleConflict(
    pageId: string,
    errorCode: ConflictErrorCode
  ): Promise<void> {
    const {
      removePageStatus,
      addPageStatus,
      pages,
      userId,
    } = deps;
    const queuedUpdate = await getQueuedUpdateById(pageId);
    if (queuedUpdate) {
      if (errorCode === ConflictErrorCode.NotFound && queuedUpdate.deleted) {
        try {
          console.log("page with queued delete does not exist on server, removing");
          removePageStatus(pageId);
          await deletePage(pageId);
          await deleteQueuedUpdate(pageId);
        } catch (error) {
          console.error("error handling queued delete of page that does not exist on server", error);
        }
      }
      else if (
        queuedUpdate.isJournal &&
        isDefaultValueJournalPage(queuedUpdate.revisionNumber)
      ) {
        console.log("queued update with conflict is journal page with default value, removing");
        removePageStatus(pageId);
        await deleteQueuedUpdate(pageId);
      } else if (
        !queuedUpdate.isJournal &&
        errorCode === ConflictErrorCode.UniquenessViolation &&
        queuedUpdate.value === DEFAULT_NONJOURNAL_PAGE_VALUE
      ) {
        console.log("queued update violating uniqueness constraint is non-journal page with default value, removing");
        alert("A page with this title already exists. Please use a different title.");
        removePageStatus(pageId);
        await deleteQueuedUpdate(pageId);
      } else {
        // I tried inserting a conflict page, but when multiple tabs were open this resulted in multiple conflict pages
        console.log("queued update with conflict is page with non-default value", queuedUpdate.title);
        addPageStatus(pageId, PageStatus.Conflict, queuedUpdate.lastModified, queuedUpdate.revisionNumber);
      }
    }
  };
}
