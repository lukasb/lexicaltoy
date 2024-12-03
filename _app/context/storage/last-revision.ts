// last-revision.ts

// this is designed to deal with a theoretical race condition in which we create a page update while
// also saving to the server - the server comes back with a new revision number, but the page update has
// the old revision number. this map stores the last revision number we synced to the server. we can safely
// accept page updates based on this value, because we know we'll only observe this due to this race condition.

let lastRevisionSynced: Map<string, number> = new Map();

export const setLastRevisionSynced = (pageId: string, version: number) => {
  lastRevisionSynced.set(pageId, version);
};

export const getLastRevisionSynced = (pageId: string) => lastRevisionSynced.get(pageId) ?? null;