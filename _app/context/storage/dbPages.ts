import { localDb } from "./db";
import { liveQuery } from "dexie";
import { Page } from "@/lib/definitions";

export const localPagesRef: { current: Page[] | undefined } = { current: undefined };
let currentObservable: any = null;
let currentSubscription: any = null;

export function initLocalPagesObservable(userId: string) {
  // Clean up any existing subscription
  if (currentSubscription) {
    currentSubscription.unsubscribe();
  }

  // Create new observable for this userId
  currentObservable = liveQuery(
    async () => {
      console.log("liveQuery", userId);
      return getLocalPages(userId);
    }
  );

  // Subscribe and update arrayRef.current
  currentSubscription = currentObservable.subscribe((newValue: Page[] | undefined) => {
    localPagesRef.current = newValue;
  });
}

export async function getLocalPages(userId: string) {
  try {
    const localPages = await localDb.pages
      .where("userId")
      .equals(userId)
      .toArray();

    //console.log("getting queuedUpdates for ", session.id);

    const queuedUpdates = await localDb.queuedUpdates
      .where("userId")
      .equals(userId)
      .toArray();

    if (!localPages || !queuedUpdates) {
      if (!localPages) console.log("🛑 localPages not found");
      if (!queuedUpdates) console.log("🛑 queuedUpdates not found");
      return undefined;
    }

    const mergedPages = [
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
    console.log("mergedPages", mergedPages.length);
    return mergedPages;
  } catch (error) {
    console.log("🛑 error getting localPages or queuedUpdates", error);
    return undefined;
  }
}

// Clean up function if you need it
export function cleanupLocalPagesObservable() {
  if (currentSubscription) {
    currentSubscription.unsubscribe();
    currentSubscription = null;
  }
  currentObservable = null;
}