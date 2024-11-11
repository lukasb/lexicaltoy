import { Page, PageStatus } from "@/lib/definitions";
import { localDb } from "./db";
import {
  fetchPagesRemote,
  fetchUpdatesSince,
  updatePageWithHistory,
  insertPageDb,
} from "@/lib/db";
import { getJournalTitle } from "@/lib/journal-helpers";
import { useLiveQuery } from "dexie-react-hooks";

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
        localDb.pages.put(page);
      }
    }
  );
  return result;
}

export async function processQueuedUpdates(
  userId: string
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
        return;
      }

      const { revisionNumber, lastModified } = await updatePageWithHistory(
        queuedUpdate.id,
        queuedUpdate.value,
        queuedUpdate.title,
        queuedUpdate.deleted,
        queuedUpdate.revisionNumber
      );

      localDb.queuedUpdates.delete(queuedUpdate.id);
      if (revisionNumber === -1 || !revisionNumber || !lastModified) {
        console.log("failed to update page", queuedUpdate.title);
        result = PageSyncResult.Conflict;
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
        console.error("failed to insert page", queuedUpdate.title);
        result = PageSyncResult.Error;
        return;
      }
      localDb.queuedUpdates.delete(queuedUpdate.id);
      localDb.pages.put(page);
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

export async function performSync(userId: string): Promise<PageSyncResult> {
  if (!navigator.onLine) return PageSyncResult.Success;
  const syncResult = await fetchUpdatedPages(userId);
  if (syncResult !== PageSyncResult.Success) return syncResult;
  return await processQueuedUpdates(userId);
}

export async function updatePage(
  page: Page,
  value: string,
  title: string,
  deleted: boolean
): Promise<PageSyncResult> {
  const queuedUpdate = await getQueuedUpdateById(page.id);
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
  if (!navigator.onLine) {
    localDb.queuedUpdates.put(pageLocalUpdate);
    return PageSyncResult.Success;
  }
  const { revisionNumber, lastModified } = await updatePageWithHistory(
    page.id,
    value,
    title,
    deleted,
    page.revisionNumber
  );
  
  if (revisionNumber === -1 || !revisionNumber || !lastModified) {
    console.error("failed to update page", page.title);
    return PageSyncResult.Conflict;
  }

  const pageUpdated = {
    ...page,
    value: value,
    title: title,
    deleted: deleted,
    revisionNumber: revisionNumber,
    lastModified: lastModified,
  };
  localDb.pages.put(pageUpdated);
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
  if (!navigator.onLine) {
    localDb.queuedUpdates.put(newPage);
    return [newPage, PageSyncResult.Success];
  } 
  const result = await insertPageDb(title, value, userId, isJournal, id);
  if (typeof result === "string") {
    localDb.queuedUpdates.put(newPage);
    console.error("expected page, got string", result);
    return [newPage, PageSyncResult.Error];
  }
  localDb.pages.put(result);
  return [result, PageSyncResult.Success];
}

export function usePages(userId: string) {
  const pages = useLiveQuery(async () => {
    /*
      pull everything from main table except deleted pages
      if an item has an entry in the queued updates table replace with that
      unless the update is a deletion, in which case remove from results.
      If there's an entry in the queued updates table that isn't in the main table, 
      include that as well
      */

    const localPages = await localDb.pages
      .where("userId")
      .equals(userId)
      .toArray();
    const queuedUpdates = await localDb.queuedUpdates
      .where("userId")
      .equals(userId)
      .toArray();

    console.log("localPages", localPages.length, localPages[0]);
    console.log("queuedUpdates", queuedUpdates.length, queuedUpdates[0]);
    return [
      ...localPages
        // remove deleted pages
        .filter((page) => !page.deleted)
        // remove pages with queued updates marking them as deleted
        .filter((page) => {
          const queuedUpdate = queuedUpdates.find(
            (update) => update.id === page.id
          );
          return !queuedUpdate?.deleted;
        })
        // replace with queued updates if they exist
        .map((page) => {
          const queuedUpdate = queuedUpdates.find(
            (update) => update.id === page.id
          );
          return queuedUpdate || page;
        }),
      // add queued updates that aren't in the main table
      ...queuedUpdates.filter(
        (update) =>
          !localPages.some((page) => page.id === update.id) && !update.deleted
      ),
    ];
  }, [userId]);

  console.log("pages", pages?.length, pages?.[0]);
  return pages || [];
}
