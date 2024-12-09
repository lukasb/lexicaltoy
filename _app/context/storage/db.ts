import Dexie, { type EntityTable } from 'dexie';
import { Page } from '@/lib/definitions';

Dexie.disableBfCache = true;

const localDb = new Dexie('orangetask-local', { cache: 'immutable' }) as Dexie & {
  pages: EntityTable<Page, 'id'>;
  queuedUpdates: EntityTable<Page, 'id'>;
  lastRevisionSynced: EntityTable<{ id: string, revisionNumber: number }, 'id'>;
};

// we only declare indexed columns here
localDb.version(1).stores({
  pages: 'id, userId', 
  queuedUpdates: 'id, userId',
  lastRevisionSynced: 'id',
});

export { localDb };