// last-revision.ts
let lastRevisionSynced: Map<string, number> = new Map();

export const setLastRevisionSynced = (pageId: string, version: number) => {
  lastRevisionSynced.set(pageId, version);
};

export const getLastRevisionSynced = (pageId: string) => lastRevisionSynced.get(pageId) ?? null;