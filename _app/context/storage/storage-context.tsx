import { Page, isPage } from "@/lib/definitions";
import { localDb } from "./db";
import {
  fetchPagesRemote,
  fetchUpdatesSince,
  updatePageWithHistory,
  insertPageDb,
} from "@/lib/db";
import { getJournalTitle } from "@/lib/journal-helpers";
import { isDevelopmentEnvironment } from "@/lib/environment";

// TODO also return titles of conflicted pages
export enum PageSyncResult {
  Success,
  Conflict,
  Error,
}

async function getLocalPageById(id: string): Promise<Page | undefined> {
  return localDb.pages.get(id);
}

async function getQueuedUpdateById(id: string): Promise<Page | undefined> {
  return localDb.queuedUpdates.get(id);
}

async function getLocalPagesByUserId(userId: string): Promise<Page[]> {
  return localDb.pages.filter((page) => page.userId === userId).toArray();
}

async function getQueuedUpdatesByUserId(userId: string): Promise<Page[]> {
  return localDb.queuedUpdates
    .filter((page) => page.userId === userId)
    .toArray();
}

async function getLocalJournalPageByDate(
  date: Date
): Promise<Page | undefined> {
  const dateStr = getJournalTitle(date);
  const updatedPage = await localDb.queuedUpdates
    .filter((page) => page.isJournal && page.title === dateStr)
    .first();
  if (updatedPage) return updatedPage;
  const page = await localDb.pages
    .filter((page) => page.isJournal && page.title === dateStr)
    .first();
  return page;
}

export async function getJournalPagesByUserId(userId: string): Promise<Page[]> {
  return localDb.pages.filter((page) => page.isJournal && page.userId === userId && !page.deleted).toArray();
}

export async function getJournalQueuedUpdatesByUserId(userId: string): Promise<Page[]> {
  return localDb.queuedUpdates.filter((page) => page.isJournal && page.userId === userId).toArray();
}

export async function deleteQueuedUpdate(id: string): Promise<void> {
  return localDb.queuedUpdates.delete(id);
}

export async function fetchUpdatedPages(
  userId: string
): Promise<PageSyncResult> {
  if (!navigator.onLine) return PageSyncResult.Success;

  let result = PageSyncResult.Success;
  await navigator.locks.request(
    "orangetask_main_table_sync",
    async (lock: Lock | null) => {
      const localPages = await getLocalPagesByUserId(userId);
      const mostRecentLastModified = localPages.reduce((max, page) => {
        return Math.max(max, page.lastModified.getTime());
      }, 0);
      const updatedPages =
        mostRecentLastModified > 0
          ? await fetchUpdatesSince(userId, new Date(mostRecentLastModified))
          : await fetchPagesRemote(userId);
      if (!updatedPages) {
        result = PageSyncResult.Error;
        return;
      }
      for (const page of updatedPages) {
        if (!isPage(page)) { 
          throw new Error(`expected page, got ${JSON.stringify(page)}`);
        }
        localDb.pages.put(page);
      }
    }
  );
  return result;
}

export async function processQueuedUpdates(
  userId: string,
  handleConflict: (pageId: string) => void
): Promise<PageSyncResult> {
  let result = PageSyncResult.Success;
  async function processQueuedUpdate(queuedUpdate: Page) {
    if (!navigator.onLine) return;

    const localPage = await getLocalPageById(queuedUpdate.id);
    if (localPage) {
      if (localPage.lastModified > queuedUpdate.lastModified) {
        result = PageSyncResult.Conflict;
        console.log(
          "our proposed update is based on an old version of the page",
          queuedUpdate.title
        );
        handleConflict(queuedUpdate.id);
        return;
      }

      if (isDevelopmentEnvironment) console.time(`updatePageWithHistory ${queuedUpdate.title}`);
      const { revisionNumber, lastModified } = await updatePageWithHistory(
        queuedUpdate.id,
        queuedUpdate.value,
        queuedUpdate.title,
        queuedUpdate.deleted,
        queuedUpdate.revisionNumber
      );
      if (isDevelopmentEnvironment) console.timeEnd(`updatePageWithHistory ${queuedUpdate.title}`);
      localDb.queuedUpdates.delete(queuedUpdate.id);
      if (revisionNumber === -1 || !revisionNumber || !lastModified) {
        console.log("failed to update page", queuedUpdate.title);
        result = PageSyncResult.Conflict;
        handleConflict(queuedUpdate.id);
        return;
      }

      const pageUpdated = {
        ...queuedUpdate,
        revisionNumber: revisionNumber,
        lastModified: lastModified,
      };
      localDb.pages.put(pageUpdated);
    } else {
      const page = await insertPageDb(queuedUpdate.title, queuedUpdate.value, userId, queuedUpdate.isJournal, queuedUpdate.id);
      if (typeof page === "string") {
        if (page.includes("duplicate key value") && queuedUpdate.isJournal) {
          console.log("duplicate journal page, deleting queued update", queuedUpdate.title);
          localDb.queuedUpdates.delete(queuedUpdate.id);
        } else {
          console.error("failed to insert page", queuedUpdate.title, page);
        }
        result = PageSyncResult.Error;
        return;
      }
      localDb.transaction("rw", localDb.pages, localDb.queuedUpdates, async () => {
        localDb.queuedUpdates.delete(queuedUpdate.id);
        if (!isPage(page)) throw new Error("expected page, got", page);
        localDb.pages.put(page);
      }).catch(err => {
        result = PageSyncResult.Error;
        throw err;
      });
    }
  }

  await navigator.locks.request(
    "orangetask_queued_updates_sync",
    async (lock: Lock | null) => {
      const queuedUpdates = await getQueuedUpdatesByUserId(userId);
      for (const queuedUpdate of queuedUpdates) {
        await processQueuedUpdate(queuedUpdate);
      }
    }
  );
  return result;
}

export async function performSync(userId: string, handleConflict: (pageId: string) => void): Promise<PageSyncResult> {
  if (!navigator.onLine) return PageSyncResult.Success;
  const syncResult = await fetchUpdatedPages(userId);
  if (syncResult !== PageSyncResult.Success) return syncResult;
  return await processQueuedUpdates(userId, handleConflict);
}

/**
 * Queue an update to this page. Our useLiveQuery will use this new value for the global pages context.
 * Update will be synced to the server next time we're online and performSync is called.
 * @param page - the page to update
 * @param value - the new value for the page
 * @param title - the new title for the page
 * @param deleted - the new deleted status for the page
 * @returns PageSyncResult
 */
export async function updatePage(
  page: Page,
  value: string,
  title: string,
  deleted: boolean
): Promise<PageSyncResult> {

  // we don't do anything to check for a conflict with queued updates
  // we rely on useLiveQuery to ensure that in-memory pages are already
  // in sync with local db / queued updates

  const localPage = await getLocalPageById(page.id);
  if (localPage && localPage.lastModified > page.lastModified) {
    // our proposed update is based on an old version of the page
    return PageSyncResult.Conflict;
  }

  const pageLocalUpdate = {
    ...page,
    value: value,
    title: title,
    deleted: deleted,
    lastModified: new Date(new Date().toISOString()),
  };
  
  localDb.queuedUpdates.put(pageLocalUpdate);
  return PageSyncResult.Success;
}

export async function insertPage(
  title: string,
  value: string,
  userId: string,
  isJournal: boolean
): Promise<[Page | undefined, PageSyncResult]> {

  // can't have two pages with the same title and user id
  const localPage = await localDb.pages
    .filter((page) => page.title === title && page.userId === userId)
    .first();
  if (localPage) return [undefined, PageSyncResult.Conflict];

  const id = crypto.randomUUID();
  const newPage = {
    id: id,
    title: title,
    value: value,
    userId: userId,
    isJournal: isJournal,
    deleted: false,
    lastModified: new Date(new Date().toISOString()),
    revisionNumber: 1,
  };

  localDb.queuedUpdates.put(newPage);
  return [newPage, PageSyncResult.Success];
}