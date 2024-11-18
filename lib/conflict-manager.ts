import {
  PageStatus,
  DEFAULT_NONJOURNAL_PAGE_VALUE,
  ConflictErrorCode,
} from "@/lib/definitions";
import {
  getQueuedUpdateById,
  deleteQueuedUpdate,
} from "@/_app/context/storage/storage-context";
import { DEFAULT_JOURNAL_CONTENTS } from "@/lib/journal-helpers";

export interface ConflictManagerDeps {
  getPageUpdate: (pageId: string) => any;
  addPageUpdate: (pageId: string, status: PageStatus) => void;
  setPageUpdateStatus: (pageId: string, status: PageStatus) => void;
  removePageUpdate: (pageId: string) => void;
}

export function createConflictHandler(deps: ConflictManagerDeps) {
  return async function handleConflict(
    pageId: string,
    errorCode: ConflictErrorCode
  ): Promise<void> {
    const {
      getPageUpdate,
      addPageUpdate,
      setPageUpdateStatus,
      removePageUpdate,
    } = deps;
    const queuedUpdate = await getQueuedUpdateById(pageId);
    if (queuedUpdate) {
      if (
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
      }
    }
    if (getPageUpdate(pageId)) {
      setPageUpdateStatus(pageId, PageStatus.Conflict);
    } else {
      addPageUpdate(pageId, PageStatus.Conflict);
    }
  };
}
